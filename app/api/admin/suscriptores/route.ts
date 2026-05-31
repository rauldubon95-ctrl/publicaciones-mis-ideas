import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized, unauthorizedResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest) {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();

  const [total, activos, pendientes, cancelados, recientes, crecimiento] = await Promise.all([
    prisma.subscription.count(),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.subscription.count({ where: { status: "PENDING" } }),
    prisma.subscription.count({ where: { status: "UNSUBSCRIBED" } }),
    prisma.subscription.findMany({
      orderBy: { creadoAt: "desc" },
      take: 50,
      select: {
        id: true,
        email: true,
        nombre: true,
        status: true,
        confirmedAt: true,
        creadoAt: true,
      },
    }),
    // Crecimiento: suscriptores activos por mes (últimos 6 meses)
    prisma.$queryRaw<{ mes: string; total: bigint }[]>`
      SELECT
        TO_CHAR(DATE_TRUNC('month', "confirmedAt"), 'YYYY-MM') AS mes,
        COUNT(*) AS total
      FROM "Subscription"
      WHERE status = 'ACTIVE'
        AND "confirmedAt" >= NOW() - INTERVAL '6 months'
      GROUP BY mes
      ORDER BY mes ASC
    `,
  ]);

  return NextResponse.json({
    stats: { total, activos, pendientes, cancelados },
    suscriptores: recientes,
    crecimiento: crecimiento.map((r) => ({ mes: r.mes, total: Number(r.total) })),
  });
}
