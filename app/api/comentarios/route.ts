import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { publicacionId, autorNombre, contenido } = body;

  if (!publicacionId || !autorNombre?.trim() || !contenido?.trim()) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  if (contenido.length > 1000 || autorNombre.length > 80) {
    return NextResponse.json({ error: "Contenido demasiado largo" }, { status: 400 });
  }

  const publicacion = await prisma.publicacion.findUnique({
    where: { id: publicacionId, publicado: true },
    select: { id: true },
  });

  if (!publicacion) {
    return NextResponse.json({ error: "Publicación no encontrada" }, { status: 404 });
  }

  const comentario = await prisma.comentario.create({
    data: {
      publicacionId,
      autorNombre: autorNombre.trim(),
      contenido: contenido.trim(),
    },
  });

  return NextResponse.json(comentario, { status: 201 });
}
