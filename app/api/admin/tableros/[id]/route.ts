import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const BUCKET_DATOS = "datos";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json() as { titulo?: string; descripcion?: string; categoria?: string; publicado?: boolean; orden?: number };

  const tablero = await prisma.tablero.update({
    where: { id },
    data: {
      ...(body.titulo !== undefined && { titulo: body.titulo }),
      ...(body.descripcion !== undefined && { descripcion: body.descripcion }),
      ...(body.categoria !== undefined && { categoria: body.categoria }),
      ...(body.publicado !== undefined && { publicado: body.publicado }),
      ...(body.orden !== undefined && { orden: body.orden }),
    },
  });
  return NextResponse.json(tablero);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;

  const tablero = await prisma.tablero.findUnique({ where: { id }, select: { archivoUrl: true } });
  if (tablero) {
    // Eliminar archivo de Storage
    const sb = getSupabaseAdmin();
    const base = sb.storage.from(BUCKET_DATOS).getPublicUrl("").data.publicUrl;
    const ruta = tablero.archivoUrl.replace(base, "").replace(/^\//, "");
    if (ruta) await sb.storage.from(BUCKET_DATOS).remove([ruta]).catch(() => {});
  }

  await prisma.tablero.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
