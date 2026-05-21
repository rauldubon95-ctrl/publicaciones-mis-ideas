import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimitDb, registrarEvento, getIp } from "@/lib/security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TIPOS_VALIDOS = ["me_gusta", "me_encanta", "inspirador"];

// sessionId debe ser un UUID v4 (generado en el cliente)
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// 30 reacciones por IP cada 5 min (cubre uso normal pero bloquea abusos)
const RATE_CONFIG = {
  maxIntentos: 30,
  ventanaMs: 5 * 60 * 1000,
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const publicacionId = searchParams.get("publicacionId");
  const sessionId = searchParams.get("sessionId");

  if (!publicacionId || !sessionId) {
    return NextResponse.json({ activos: [] });
  }

  if (!UUID_RE.test(sessionId)) {
    return NextResponse.json({ activos: [] });
  }

  const reacciones = await prisma.reaccion.findMany({
    where: { publicacionId, sessionId },
    select: { tipo: true },
  });

  return NextResponse.json({ activos: reacciones.map((r) => r.tipo) });
}

export async function POST(req: NextRequest) {
  const ip = getIp(req);

  const rate = await checkRateLimitDb(ip, "reacciones", RATE_CONFIG);
  if (!rate.permitido) {
    await registrarEvento("RATE_LIMIT", ip, "/api/reacciones");
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const { publicacionId, tipo, sessionId } = body as {
    publicacionId?: string;
    tipo?: string;
    sessionId?: string;
  };

  if (
    !publicacionId ||
    typeof publicacionId !== "string" ||
    !sessionId ||
    typeof sessionId !== "string" ||
    !UUID_RE.test(sessionId) ||
    !tipo ||
    !TIPOS_VALIDOS.includes(tipo)
  ) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  const existente = await prisma.reaccion.findUnique({
    where: { publicacionId_sessionId_tipo: { publicacionId, sessionId, tipo } },
  });

  if (existente) {
    await prisma.reaccion.delete({ where: { id: existente.id } });
  } else {
    // Verificar que la publicación existe y está publicada antes de crear
    const pub = await prisma.publicacion.findUnique({
      where: { id: publicacionId, publicado: true },
      select: { id: true },
    });
    if (!pub) {
      return NextResponse.json({ error: "Publicación no encontrada" }, { status: 404 });
    }
    await prisma.reaccion.create({ data: { publicacionId, sessionId, tipo } });
  }

  const conteo = await prisma.reaccion.count({ where: { publicacionId, tipo } });
  return NextResponse.json({ conteo });
}
