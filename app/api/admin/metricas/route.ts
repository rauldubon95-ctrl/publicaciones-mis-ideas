import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { isAdminAuthorized, unauthorizedResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Buckets de Storage que cuentan para el uso. Los archivos NO están en la raíz:
// los cómics viven en subcarpetas por id y los libros en libros/pdfs y
// libros/portadas. La API list() no es recursiva, así que bajamos por cada
// carpeta (entradas con id=null) para no subcontar.
const BUCKETS_STORAGE = ["comics", "libros", "datos"];

async function sumarBucketStorage(
  sb: ReturnType<typeof getSupabaseAdmin>,
  bucket: string,
  prefijo = ""
): Promise<{ archivos: number; bytes: number }> {
  const { data } = await sb.storage.from(bucket).list(prefijo, { limit: 1000 });
  let archivos = 0;
  let bytes = 0;
  for (const item of data ?? []) {
    const esCarpeta = item.id === null; // las carpetas no tienen id ni metadata
    if (esCarpeta) {
      const sub = await sumarBucketStorage(
        sb,
        bucket,
        prefijo ? `${prefijo}/${item.name}` : item.name
      );
      archivos += sub.archivos;
      bytes += sub.bytes;
    } else {
      archivos += 1;
      bytes += (item.metadata as { size?: number } | null)?.size ?? 0;
    }
  }
  return { archivos, bytes };
}

// Cómputo pesado (18 queries + recorrido recursivo de Storage) cacheado 2 min.
// Antes corría en CADA visita al panel (3-8 s). La autenticación se hace fuera
// del caché (lee cookies); aquí solo van datos agregados, ligeramente diferidos.
const getMetricas = unstable_cache(
  async () => {
  const ahora = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const hace30 = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000);
  const hace7  = new Date(ahora.getTime() - 7  * 24 * 60 * 60 * 1000);

  const [
    totalVistas,
    vistasEstesMes,
    totalDescargas,
    descargasEsteMes,
    totalPublicaciones,
    publicacionesPublicadas,
    totalComentarios,
    totalVistasComics,
    totalVistasRecursos,
    vistasPorDia,
    descargasPorDia,
    topArticulos,
    vistasPorPais,
    descargasPorPais,
    vistasPorDispositivo,
    vistasUltimos7,
    dbSize,
    storageStats,
  ] = await Promise.all([
    prisma.vistaPublicacion.count(),
    prisma.vistaPublicacion.count({ where: { creadoAt: { gte: inicioMes } } }),
    prisma.descargaPdf.count(),
    prisma.descargaPdf.count({ where: { creadoAt: { gte: inicioMes } } }),
    prisma.publicacion.count(),
    prisma.publicacion.count({ where: { publicado: true } }),
    prisma.comentario.count(),
    prisma.vistaComic.count(),
    prisma.vistaRecurso.count(),

    prisma.$queryRaw<{ dia: string; total: number }[]>`
      SELECT TO_CHAR("creadoAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS dia, COUNT(*)::int AS total
      FROM "VistaPublicacion" WHERE "creadoAt" >= ${hace30}
      GROUP BY dia ORDER BY dia ASC
    `,
    prisma.$queryRaw<{ dia: string; total: number }[]>`
      SELECT TO_CHAR("creadoAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS dia, COUNT(*)::int AS total
      FROM "DescargaPdf" WHERE "creadoAt" >= ${hace30}
      GROUP BY dia ORDER BY dia ASC
    `,
    prisma.$queryRaw<{ titulo: string; slug: string; vistas: number; descargas: number }[]>`
      SELECT p.titulo, p.slug,
        COUNT(DISTINCT v.id)::int AS vistas,
        COUNT(DISTINCT d.id)::int AS descargas
      FROM "Publicacion" p
      LEFT JOIN "VistaPublicacion" v ON v."publicacionId" = p.id
      LEFT JOIN "DescargaPdf"      d ON d."publicacionId" = p.id
      WHERE p.publicado = true
      GROUP BY p.id, p.titulo, p.slug
      ORDER BY vistas DESC LIMIT 5
    `,
    prisma.$queryRaw<{ pais: string; total: number }[]>`
      SELECT COALESCE(pais, 'Desconocido') AS pais, COUNT(*)::int AS total
      FROM "VistaPublicacion" WHERE "creadoAt" >= ${hace30}
      GROUP BY pais ORDER BY total DESC LIMIT 8
    `,
    prisma.$queryRaw<{ pais: string; total: number }[]>`
      SELECT COALESCE(pais, 'Desconocido') AS pais, COUNT(*)::int AS total
      FROM "DescargaPdf" WHERE "creadoAt" >= ${hace30}
      GROUP BY pais ORDER BY total DESC LIMIT 8
    `,
    prisma.$queryRaw<{ dispositivo: string; total: number }[]>`
      SELECT COALESCE(dispositivo, 'desktop') AS dispositivo, COUNT(*)::int AS total
      FROM "VistaPublicacion" WHERE "creadoAt" >= ${hace30}
      GROUP BY dispositivo ORDER BY total DESC
    `,
    prisma.vistaPublicacion.count({ where: { creadoAt: { gte: hace7 } } }),

    // Tamaño de la base de datos (bytes)
    prisma.$queryRaw<{ bytes: bigint }[]>`
      SELECT pg_database_size(current_database())::bigint AS bytes
    `.then((r) => Number(r[0]?.bytes ?? 0)).catch(() => 0),

    // Uso real de Supabase Storage: suma los 3 buckets (comics + libros + datos)
    // recorriendo subcarpetas, no solo la raíz de uno.
    (async () => {
      try {
        const sb = getSupabaseAdmin();
        let totalBytes = 0;
        let totalArchivos = 0;
        for (const bucket of BUCKETS_STORAGE) {
          const r = await sumarBucketStorage(sb, bucket);
          totalBytes += r.bytes;
          totalArchivos += r.archivos;
        }
        return { bucketExiste: true, totalArchivos, totalBytes };
      } catch {
        return { bucketExiste: false, totalArchivos: 0, totalBytes: 0 };
      }
    })(),
  ]);

  return {
    resumen: {
      totalVistas, vistasEstesMes,
      totalDescargas, descargasEsteMes,
      totalPublicaciones, publicacionesPublicadas,
      totalComentarios, vistasUltimos7,
      totalVistasComics, totalVistasRecursos,
    },
    graficos: { vistasPorDia, descargasPorDia },
    tablas: { topArticulos, vistasPorPais, descargasPorPais, vistasPorDispositivo },
    supabase: {
      dbBytes: dbSize,
      storageBytes: storageStats.totalBytes,
      storageArchivos: storageStats.totalArchivos,
      bucketExiste: storageStats.bucketExiste,
      // Límites plan gratuito de Supabase
      limites: {
        dbBytes:      500 * 1024 * 1024,   // 500 MB
        storageBytes: 1024 * 1024 * 1024,  // 1 GB
        bandwidthBytes: 5 * 1024 * 1024 * 1024, // 5 GB/mes
      },
    },
  };
  },
  ["admin-metricas"],
  { revalidate: 120, tags: ["metricas"] }
);

export async function GET(_req: NextRequest) {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();
  return NextResponse.json(await getMetricas());
}
