import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimitDb, getIp } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ip = getIp(req);
  const rl = await checkRateLimitDb(ip, "/api/dashboard", {
    maxIntentos: 30,
    ventanaMs: 60 * 1000,
    failBehavior: "open",
  });
  if (!rl.permitido) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Espera un momento." },
      { status: 429 }
    );
  }

  const tableros = await prisma.tablero.findMany({
    where: { publicado: true },
    orderBy: [{ orden: "asc" }, { creadoAt: "desc" }],
    select: {
      id: true, titulo: true, slug: true, descripcion: true,
      categoria: true, archivoNombre: true, creadoAt: true,
    },
  });
  return NextResponse.json(tableros);
}
