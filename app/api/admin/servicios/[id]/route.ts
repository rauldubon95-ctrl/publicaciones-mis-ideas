import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized, unauthorizedResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();

  const { id } = await params;
  const servicio = await prisma.servicio.findUnique({ where: { id } });
  if (!servicio) return NextResponse.json({ error: "No encontrado." }, { status: 404 });

  return NextResponse.json(servicio);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();

  const { id } = await params;
  const servicio = await prisma.servicio.findUnique({ where: { id } });
  if (!servicio) return NextResponse.json({ error: "No encontrado." }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Formato inválido." }, { status: 400 });
  }

  const titulo =
    typeof body.titulo === "string" && body.titulo.trim()
      ? body.titulo.trim()
      : servicio.titulo;
  const descripcion =
    typeof body.descripcion === "string" && body.descripcion.trim()
      ? body.descripcion.trim()
      : servicio.descripcion;
  const categoria =
    typeof body.categoria === "string" && body.categoria.trim()
      ? body.categoria.trim()
      : servicio.categoria;
  const detalle =
    typeof body.detalle === "string" ? body.detalle.trim() || null : servicio.detalle;
  const icono =
    typeof body.icono === "string" ? body.icono.trim() || null : servicio.icono;
  const activo = typeof body.activo === "boolean" ? body.activo : servicio.activo;
  const orden = typeof body.orden === "number" ? body.orden : servicio.orden;

  if (titulo.length > 120)
    return NextResponse.json({ error: "Título demasiado largo (máx 120)." }, { status: 422 });
  if (descripcion.length > 500)
    return NextResponse.json({ error: "Descripción demasiado larga (máx 500)." }, { status: 422 });

  const actualizado = await prisma.servicio.update({
    where: { id },
    data: { titulo, descripcion, categoria, detalle, icono, activo, orden },
  });

  return NextResponse.json(actualizado);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();

  const { id } = await params;
  const servicio = await prisma.servicio.findUnique({ where: { id } });
  if (!servicio) return NextResponse.json({ error: "No encontrado." }, { status: 404 });

  await prisma.servicio.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
