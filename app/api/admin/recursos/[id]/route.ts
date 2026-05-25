import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized, unauthorizedResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const { titulo, descripcion, contenido, publicado } = (body ?? {}) as Record<string, unknown>;

  if (
    typeof titulo !== "string" || !titulo.trim() ||
    typeof descripcion !== "string" || !descripcion.trim() ||
    typeof contenido !== "string" || !contenido.trim() || contenido.length > 2_000_000
  ) {
    return NextResponse.json({ error: "Campos inválidos" }, { status: 400 });
  }

  const recurso = await prisma.recursoHtml.update({
    where: { id },
    data: { titulo, descripcion, contenido, publicado: !!publicado },
  });
  return NextResponse.json(recurso);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();
  const { id } = await params;
  await prisma.recursoHtml.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
