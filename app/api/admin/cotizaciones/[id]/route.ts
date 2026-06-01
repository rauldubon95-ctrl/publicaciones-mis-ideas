import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized, unauthorizedResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

const ESTADOS_VALIDOS = ["PENDIENTE", "REVISADO", "RESPONDIDA", "ARCHIVADO"];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();

  const { id } = await params;
  const cotizacion = await prisma.solicitudCotizacion.findUnique({
    where: { id },
    include: {
      servicio: { select: { titulo: true, categoria: true } },
      respuestas: { orderBy: { creadoAt: "desc" } },
    },
  });
  if (!cotizacion) return NextResponse.json({ error: "No encontrado." }, { status: 404 });

  return NextResponse.json(cotizacion);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();

  const { id } = await params;
  const solicitud = await prisma.solicitudCotizacion.findUnique({ where: { id } });
  if (!solicitud) return NextResponse.json({ error: "No encontrado." }, { status: 404 });

  let body: { estado?: string };
  try {
    body = await req.json() as { estado?: string };
  } catch {
    return NextResponse.json({ error: "Formato inválido." }, { status: 400 });
  }

  if (!body.estado || !ESTADOS_VALIDOS.includes(body.estado)) {
    return NextResponse.json(
      { error: `Estado inválido. Valores permitidos: ${ESTADOS_VALIDOS.join(", ")}` },
      { status: 422 }
    );
  }

  const actualizada = await prisma.solicitudCotizacion.update({
    where: { id },
    data: { estado: body.estado },
  });

  return NextResponse.json(actualizada);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();

  const { id } = await params;
  const solicitud = await prisma.solicitudCotizacion.findUnique({ where: { id } });
  if (!solicitud) return NextResponse.json({ error: "No encontrado." }, { status: 404 });

  await prisma.solicitudCotizacion.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
