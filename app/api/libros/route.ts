import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const libros = await prisma.libro.findMany({
    where: { publicado: true },
    orderBy: { creadoAt: "desc" },
    select: {
      id: true, titulo: true, slug: true, descripcion: true,
      paginas: true, precioCentavos: true, imagenPortada: true,
      creadoAt: true, _count: { select: { descargas: true } },
    },
  });
  return NextResponse.json(libros);
}
