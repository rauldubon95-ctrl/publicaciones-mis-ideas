import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized, unauthorizedResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();

  const estado = req.nextUrl.searchParams.get("estado");
  const where = estado ? { estado } : {};

  const [compras, totalRecaudadoRow] = await Promise.all([
    prisma.pedidoContenido.findMany({
      where,
      orderBy: { creadoAt: "desc" },
      take: 200,
      include: {
        publicacion: { select: { titulo: true, slug: true } },
      },
    }),
    prisma.pedidoContenido.aggregate({
      where: { estado: "COMPLETADO" },
      _sum: { montoCentavos: true },
      _count: true,
    }),
  ]);

  return NextResponse.json({
    compras,
    totalRecaudado: totalRecaudadoRow._sum.montoCentavos ?? 0,
    totalCompletadas: totalRecaudadoRow._count,
  });
}
