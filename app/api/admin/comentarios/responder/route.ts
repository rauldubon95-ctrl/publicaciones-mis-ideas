import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized, unauthorizedResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { sanitizarTexto } from "@/lib/security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });

  const { publicacionId, parentId, contenido } = body as {
    publicacionId?: string;
    parentId?: string;
    contenido?: string;
  };

  if (!publicacionId || !contenido?.trim()) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  if (contenido.length > 2000) {
    return NextResponse.json({ error: "Contenido demasiado largo" }, { status: 400 });
  }

  let profundidad = 0;
  if (parentId) {
    const padre = await prisma.comentario.findFirst({
      where: { id: parentId, publicacionId },
      select: { profundidad: true },
    });
    profundidad = padre ? Math.min(padre.profundidad + 1, 2) : 0;
  }

  const comentario = await prisma.comentario.create({
    data: {
      publicacionId,
      parentId: parentId ?? null,
      autorNombre: "Autor",
      contenido: sanitizarTexto(contenido),
      esAdmin: true,
      profundidad,
    },
    select: {
      id: true, contenido: true, autorNombre: true,
      esAdmin: true, estado: true, parentId: true,
      profundidad: true, creadoAt: true, actualizadoAt: true,
    },
  });

  return NextResponse.json({
    ...comentario,
    respuestas: [],
    creadoAt: comentario.creadoAt.toISOString(),
    actualizadoAt: comentario.actualizadoAt.toISOString(),
  }, { status: 201 });
}
