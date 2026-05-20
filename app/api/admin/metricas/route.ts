import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized, unauthorizedResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();

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

    // Archivos e tamaño en Supabase Storage
    (async () => {
      try {
        const sb = getSupabaseAdmin();
        const { data: buckets } = await sb.storage.listBuckets();
        const comicsBucket = buckets?.find((b) => b.id === "comics");

        // Obtener tamaño total de objetos en el bucket
        const { data: files } = await sb.storage.from("comics").list("", {
          limit: 1000,
          offset: 0,
        });

        const totalBytes = files?.reduce((sum, f) => {
          const size = (f.metadata as { size?: number } | null)?.size ?? 0;
          return sum + size;
        }, 0) ?? 0;

        return {
          bucketExiste: !!comicsBucket,
          totalArchivos: files?.length ?? 0,
          totalBytes,
        };
      } catch {
        return { bucketExiste: false, totalArchivos: 0, totalBytes: 0 };
      }
    })(),
  ]);

  return NextResponse.json({
    resumen: {
      totalVistas, vistasEstesMes,
      totalDescargas, descargasEsteMes,
      totalPublicaciones, publicacionesPublicadas,
      totalComentarios, vistasUltimos7,
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
  });
}
