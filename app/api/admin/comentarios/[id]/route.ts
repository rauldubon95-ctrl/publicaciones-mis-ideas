import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized, unauthorizedResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// PATCH: cambiar estado (VISIBLE / OCULTO / ELIMINADO)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();
  const { id } = await params;

  const { estado } = await req.json().catch(() => ({})) as { estado?: string };
  const ESTADOS = ["VISIBLE", "OCULTO", "ELIMINADO"];
  if (!estado || !ESTADOS.includes(estado)) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }

  const comentario = await prisma.comentario.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!comentario) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  await prisma.comentario.update({
    where: { id },
    data: { estado },
  });

  return NextResponse.json({ ok: true });
}

// DELETE: eliminar permanentemente (y sus respuestas por cascade)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();
  const { id } = await params;

  const comentario = await prisma.comentario.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!comentario) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  await prisma.comentario.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
