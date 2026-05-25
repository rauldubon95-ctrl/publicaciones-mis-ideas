import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
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
