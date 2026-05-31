import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthorized } from "@/lib/adminAuth";

const ESTADOS_VALIDOS = ["PENDIENTE", "COMPLETADO", "FALLIDO", "CANCELADO"];

export async function GET(req: NextRequest) {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const estado = searchParams.get("estado") ?? "";

  const where =
    estado && ESTADOS_VALIDOS.includes(estado) ? { estado } : {};

  const [donaciones, totalRecaudado] = await Promise.all([
    prisma.donacion.findMany({
      where,
      orderBy: { creadoAt: "desc" },
    }),
    prisma.donacion.aggregate({
      where: { estado: "COMPLETADO" },
      _sum: { monto: true },
    }),
  ]);

  return NextResponse.json({
    donaciones,
    total: donaciones.length,
    totalRecaudado: totalRecaudado._sum.monto ?? 0,
  });
}
