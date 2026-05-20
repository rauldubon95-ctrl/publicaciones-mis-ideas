import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized, unauthorizedResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { subirImagen, eliminarImagen } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB por imagen

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();
  const paginas = await prisma.paginaComic.findMany({
    where: { comicId: params.id },
    orderBy: { orden: "asc" },
  });
  return NextResponse.json(paginas);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();

  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });

  const imagen = formData.get("imagen") as File | null;
  const caption = (formData.get("caption") as string | null)?.trim().slice(0, 300) ?? null;

  if (!imagen) return NextResponse.json({ error: "Se requiere una imagen" }, { status: 400 });
  if (!TIPOS_PERMITIDOS.includes(imagen.type)) {
    return NextResponse.json({ error: "Tipo de archivo no permitido (JPEG, PNG, WebP o GIF)" }, { status: 400 });
  }
  if (imagen.size > MAX_BYTES) {
    return NextResponse.json({ error: "La imagen no puede superar 8 MB" }, { status: 400 });
  }

  const buffer = Buffer.from(await imagen.arrayBuffer());
  const imageUrl = await subirImagen(buffer, imagen.name, imagen.type);

  const ultimo = await prisma.paginaComic.findFirst({
    where: { comicId: params.id },
    orderBy: { orden: "desc" },
  });
  const orden = (ultimo?.orden ?? 0) + 1;

  const pagina = await prisma.paginaComic.create({
    data: { comicId: params.id, imageUrl, orden, caption },
  });
  return NextResponse.json(pagina, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();

  const { paginaId } = await req.json().catch(() => ({})) as { paginaId?: string };
  if (!paginaId) return NextResponse.json({ error: "Se requiere paginaId" }, { status: 400 });

  const pagina = await prisma.paginaComic.findFirst({
    where: { id: paginaId, comicId: params.id },
  });
  if (!pagina) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  await eliminarImagen(pagina.imageUrl).catch(() => {});
  await prisma.paginaComic.delete({ where: { id: paginaId } });

  // Re-numerar las páginas restantes
  const restantes = await prisma.paginaComic.findMany({
    where: { comicId: params.id },
    orderBy: { orden: "asc" },
  });
  await Promise.all(
    restantes.map((p, i) => prisma.paginaComic.update({ where: { id: p.id }, data: { orden: i + 1 } }))
  );

  return NextResponse.json({ ok: true });
}
