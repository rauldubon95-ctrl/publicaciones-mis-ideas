import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized, unauthorizedResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest) {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();

  // select explícito: la lista del admin solo necesita estos campos. Antes un
  // `include` traía TODOS los campos —incluido el `contenido` completo de cada
  // artículo—, enviando megabytes de cuerpos de texto solo para listar títulos.
  const publicaciones = await prisma.publicacion.findMany({
    orderBy: { creadoAt: "desc" },
    select: {
      id: true,
      titulo: true,
      slug: true,
      publicado: true,
      creadoAt: true,
      categoria: { select: { nombre: true } },
      _count: { select: { comentarios: true, reacciones: true } },
    },
  });

  return NextResponse.json(publicaciones);
}
