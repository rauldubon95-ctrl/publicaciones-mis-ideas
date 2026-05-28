import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
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
