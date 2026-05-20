import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized, unauthorizedResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { eliminarImagen } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();
  const paginas = await prisma.paginaComic.findMany({
    where: { comicId: params.id },
    orderBy: { orden: "asc" },
  });
  return NextResponse.json(paginas);
}

// Recibe la URL pública ya subida directamente a Supabase desde el navegador
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();

  const body = await req.json().catch(() => null);
  const { imageUrl, caption } = (body ?? {}) as { imageUrl?: string; caption?: string };

  if (!imageUrl || typeof imageUrl !== "string" || !imageUrl.startsWith("https://")) {
    return NextResponse.json({ error: "URL de imagen inválida" }, { status: 400 });
  }

  const ultimo = await prisma.paginaComic.findFirst({
    where: { comicId: params.id },
    orderBy: { orden: "desc" },
  });

  const pagina = await prisma.paginaComic.create({
    data: {
      comicId: params.id,
      imageUrl,
      orden: (ultimo?.orden ?? 0) + 1,
      caption: caption?.trim().slice(0, 300) ?? null,
    },
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

  const restantes = await prisma.paginaComic.findMany({
    where: { comicId: params.id },
    orderBy: { orden: "asc" },
  });
  await Promise.all(
    restantes.map((p, i) =>
      prisma.paginaComic.update({ where: { id: p.id }, data: { orden: i + 1 } })
    )
  );

  return NextResponse.json({ ok: true });
}
