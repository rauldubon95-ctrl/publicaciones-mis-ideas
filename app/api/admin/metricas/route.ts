import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const cookieStore = cookies();
  const secret = process.env.ADMIN_SECRET;
  const token = cookieStore.get("admin_auth")?.value;
  if (!secret || !token || !(await verifySessionToken(token, secret))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

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
  ] = await Promise.all([
    prisma.vistaPublicacion.count(),
    prisma.vistaPublicacion.count({ where: { creadoAt: { gte: inicioMes } } }),
    prisma.descargaPdf.count(),
    prisma.descargaPdf.count({ where: { creadoAt: { gte: inicioMes } } }),
    prisma.publicacion.count(),
    prisma.publicacion.count({ where: { publicado: true } }),
    prisma.comentario.count(),

    // Vistas por día (últimos 30 días)
    prisma.$queryRaw<{ dia: string; total: number }[]>`
      SELECT
        TO_CHAR("creadoAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS dia,
        COUNT(*)::int AS total
      FROM "VistaPublicacion"
      WHERE "creadoAt" >= ${hace30}
      GROUP BY dia
      ORDER BY dia ASC
    `,

    // Descargas por día (últimos 30 días)
    prisma.$queryRaw<{ dia: string; total: number }[]>`
      SELECT
        TO_CHAR("creadoAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS dia,
        COUNT(*)::int AS total
      FROM "DescargaPdf"
      WHERE "creadoAt" >= ${hace30}
      GROUP BY dia
      ORDER BY dia ASC
    `,

    // Top 5 artículos por vistas
    prisma.$queryRaw<{ titulo: string; slug: string; vistas: number; descargas: number }[]>`
      SELECT
        p.titulo,
        p.slug,
        COUNT(DISTINCT v.id)::int AS vistas,
        COUNT(DISTINCT d.id)::int AS descargas
      FROM "Publicacion" p
      LEFT JOIN "VistaPublicacion" v ON v."publicacionId" = p.id
      LEFT JOIN "DescargaPdf"      d ON d."publicacionId" = p.id
      WHERE p.publicado = true
      GROUP BY p.id, p.titulo, p.slug
      ORDER BY vistas DESC
      LIMIT 5
    `,

    // Vistas por país (top 8)
    prisma.$queryRaw<{ pais: string; total: number }[]>`
      SELECT COALESCE(pais, 'Desconocido') AS pais, COUNT(*)::int AS total
      FROM "VistaPublicacion"
      WHERE "creadoAt" >= ${hace30}
      GROUP BY pais
      ORDER BY total DESC
      LIMIT 8
    `,

    // Descargas por país (top 8)
    prisma.$queryRaw<{ pais: string; total: number }[]>`
      SELECT COALESCE(pais, 'Desconocido') AS pais, COUNT(*)::int AS total
      FROM "DescargaPdf"
      WHERE "creadoAt" >= ${hace30}
      GROUP BY pais
      ORDER BY total DESC
      LIMIT 8
    `,

    // Vistas por dispositivo
    prisma.$queryRaw<{ dispositivo: string; total: number }[]>`
      SELECT COALESCE(dispositivo, 'desktop') AS dispositivo, COUNT(*)::int AS total
      FROM "VistaPublicacion"
      WHERE "creadoAt" >= ${hace30}
      GROUP BY dispositivo
      ORDER BY total DESC
    `,

    // Vistas últimos 7 días (para tendencia)
    prisma.vistaPublicacion.count({ where: { creadoAt: { gte: hace7 } } }),
  ]);

  return NextResponse.json({
    resumen: {
      totalVistas,
      vistasEstesMes,
      totalDescargas,
      descargasEsteMes,
      totalPublicaciones,
      publicacionesPublicadas,
      totalComentarios,
      vistasUltimos7,
    },
    graficos: {
      vistasPorDia,
      descargasPorDia,
    },
    tablas: {
      topArticulos,
      vistasPorPais,
      descargasPorPais,
      vistasPorDispositivo,
    },
  });
}
