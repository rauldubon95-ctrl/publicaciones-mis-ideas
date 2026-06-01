import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthorized } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ok = await isAdminAuthorized();
  if (!ok) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const url = new URL(req.url);
  const estado = url.searchParams.get("estado") ?? undefined;

  const [ventas, agregado] = await Promise.all([
    prisma.pedidoLibro.findMany({
      where: estado ? { estado } : undefined,
      orderBy: { creadoAt: "desc" },
      take: 200,
      select: {
        id: true,
        emailComprador: true,
        nombreComprador: true,
        montoCentavos: true,
        moneda: true,
        estado: true,
        paypalOrderId: true,
        creadoAt: true,
        completadoAt: true,
        libro: { select: { titulo: true, slug: true } },
      },
    }),
    prisma.pedidoLibro.aggregate({
      where: { estado: "COMPLETADO" },
      _sum: { montoCentavos: true },
      _count: { id: true },
    }),
  ]);

  return NextResponse.json({
    ventas,
    totalRecaudado: agregado._sum.montoCentavos ?? 0,
    totalCompletadas: agregado._count.id,
  });
}
