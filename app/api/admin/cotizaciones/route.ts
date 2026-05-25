import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized, unauthorizedResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();

  const { searchParams } = req.nextUrl;
  const estado = searchParams.get("estado"); // PENDIENTE | REVISADO | ARCHIVADO
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "50") || 50);
  const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0") || 0);

  const where = estado ? { estado } : {};

  const [solicitudes, total] = await Promise.all([
    prisma.solicitudCotizacion.findMany({
      where,
      orderBy: { creadoAt: "desc" },
      take: limit,
      skip: offset,
      include: { servicio: { select: { titulo: true, categoria: true } } },
    }),
    prisma.solicitudCotizacion.count({ where }),
  ]);

  return NextResponse.json({ solicitudes, total, limit, offset });
}
