import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimitDb, getIp } from "@/lib/security";

export async function GET(req: NextRequest) {
  const ip = getIp(req);
  const rl = await checkRateLimitDb(ip, "/api/servicios", {
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

  const servicios = await prisma.servicio.findMany({
    where: { activo: true },
    orderBy: [{ orden: "asc" }, { categoria: "asc" }, { titulo: "asc" }],
    select: {
      id: true,
      titulo: true,
      slug: true,
      descripcion: true,
      categoria: true,
      icono: true,
    },
  });

  return NextResponse.json(servicios, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
