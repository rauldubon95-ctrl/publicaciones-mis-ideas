import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized, unauthorizedResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { eliminarImagen } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const { titulo, descripcion, publicado } = (body ?? {}) as Record<string, unknown>;

  if (
    typeof titulo !== "string" || !titulo.trim() ||
    typeof descripcion !== "string" || !descripcion.trim()
  ) {
    return NextResponse.json({ error: "Campos inválidos" }, { status: 400 });
  }

  const comic = await prisma.comic.update({
    where: { id },
    data: { titulo, descripcion, publicado: !!publicado },
  });
  return NextResponse.json(comic);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();
  const { id } = await params;

  // Eliminar imágenes de Storage antes de borrar el registro
  const paginas = await prisma.paginaComic.findMany({ where: { comicId: id } });
  await Promise.allSettled(paginas.map((p) => eliminarImagen(p.imageUrl)));

  await prisma.comic.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
