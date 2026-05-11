import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TIPOS_VALIDOS = ["me_gusta", "me_encanta", "inspirador"];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const publicacionId = searchParams.get("publicacionId");
  const sessionId = searchParams.get("sessionId");

  if (!publicacionId || !sessionId) {
    return NextResponse.json({ activos: [] });
  }

  const reacciones = await prisma.reaccion.findMany({
    where: { publicacionId, sessionId },
    select: { tipo: true },
  });

  return NextResponse.json({ activos: reacciones.map((r) => r.tipo) });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { publicacionId, tipo, sessionId } = body;

  if (!publicacionId || !sessionId || !TIPOS_VALIDOS.includes(tipo)) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  const existente = await prisma.reaccion.findUnique({
    where: { publicacionId_sessionId_tipo: { publicacionId, sessionId, tipo } },
  });

  if (existente) {
    await prisma.reaccion.delete({ where: { id: existente.id } });
  } else {
    await prisma.reaccion.create({ data: { publicacionId, sessionId, tipo } });
  }

  const conteo = await prisma.reaccion.count({ where: { publicacionId, tipo } });
  return NextResponse.json({ conteo });
}
