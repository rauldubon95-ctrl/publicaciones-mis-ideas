import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimitDb, registrarEvento, sanitizarTexto, getIp } from "@/lib/security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RATE_CONFIG = {
  maxIntentos: 3,
  ventanaMs: 10 * 60 * 1000,
  bloqueoMs: 20 * 60 * 1000,
};

const SPAM_PATTERNS = [
  /\b(viagra|casino|crypto|bitcoin|forex|loan|click here|free money)\b/i,
  /https?:\/\/[^\s]{3,}/,
  /(.)\1{8,}/,
];

function tieneSpam(texto: string): boolean {
  return SPAM_PATTERNS.some((p) => p.test(texto));
}

// Construye el árbol de comentarios en memoria (eficiente para blogs)
export interface ComentarioPlano {
  id: string;
  contenido: string;
  autorNombre: string;
  esAdmin: boolean;
  estado: string;
  parentId: string | null;
  profundidad: number;
  creadoAt: string;
  actualizadoAt: string;
}

export interface ComentarioArbol extends ComentarioPlano {
  respuestas: ComentarioArbol[];
}

function construirArbol(planos: ComentarioPlano[]): ComentarioArbol[] {
  const mapa = new Map<string, ComentarioArbol>();
  const raices: ComentarioArbol[] = [];

  for (const c of planos) {
    mapa.set(c.id, { ...c, respuestas: [] });
  }

  mapa.forEach((nodo) => {
    if (nodo.parentId && mapa.has(nodo.parentId)) {
      mapa.get(nodo.parentId)!.respuestas.push(nodo);
    } else {
      raices.push(nodo);
    }
  });

  return raices;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const publicacionId = searchParams.get("publicacionId");

  if (!publicacionId) {
    return NextResponse.json({ error: "publicacionId requerido" }, { status: 400 });
  }

  const comentarios = await prisma.comentario.findMany({
    where: { publicacionId, estado: "VISIBLE" },
    orderBy: { creadoAt: "asc" },
    select: {
      id: true,
      contenido: true,
      autorNombre: true,
      esAdmin: true,
      estado: true,
      parentId: true,
      profundidad: true,
      creadoAt: true,
      actualizadoAt: true,
    },
  });

  const planos: ComentarioPlano[] = comentarios.map((c) => ({
    ...c,
    creadoAt: c.creadoAt.toISOString(),
    actualizadoAt: c.actualizadoAt.toISOString(),
  }));

  return NextResponse.json(construirArbol(planos));
}

export async function POST(req: NextRequest) {
  const ip = getIp(req);

  const rate = await checkRateLimitDb(ip, "comentarios", RATE_CONFIG);
  if (!rate.permitido) {
    await registrarEvento("RATE_LIMIT", ip, "/api/comentarios", {
      contador: rate.contador,
    });
    return NextResponse.json(
      { error: "Demasiados comentarios. Espera unos minutos." },
      { status: 429 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const { publicacionId, autorNombre, contenido, parentId } = body as {
    publicacionId?: string;
    autorNombre?: string;
    contenido?: string;
    parentId?: string;
  };

  if (
    !publicacionId ||
    typeof publicacionId !== "string" ||
    !autorNombre?.trim() ||
    !contenido?.trim()
  ) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  if (contenido.length > 1000 || autorNombre.length > 80) {
    return NextResponse.json({ error: "Contenido demasiado largo" }, { status: 400 });
  }

  if (tieneSpam(contenido) || tieneSpam(autorNombre)) {
    await registrarEvento("SPAM", ip, "/api/comentarios", {
      autorNombre: autorNombre.slice(0, 40),
    });
    return NextResponse.json(
      { error: "Comentario rechazado por filtro de contenido" },
      { status: 422 }
    );
  }

  const publicacion = await prisma.publicacion.findUnique({
    where: { id: publicacionId, publicado: true },
    select: { id: true },
  });
  if (!publicacion) {
    return NextResponse.json({ error: "Publicación no encontrada" }, { status: 404 });
  }

  // Validar parentId y calcular profundidad
  let profundidad = 0;
  if (parentId && typeof parentId === "string") {
    const padre = await prisma.comentario.findFirst({
      where: { id: parentId, publicacionId, estado: "VISIBLE" },
      select: { profundidad: true },
    });
    if (!padre) {
      return NextResponse.json({ error: "Comentario padre no encontrado" }, { status: 404 });
    }
    if (padre.profundidad >= 2) {
      // Máximo 3 niveles: aplanar el hilo al nivel 2
      profundidad = 2;
    } else {
      profundidad = padre.profundidad + 1;
    }
  }

  const comentario = await prisma.comentario.create({
    data: {
      publicacionId,
      autorNombre: sanitizarTexto(autorNombre),
      contenido: sanitizarTexto(contenido),
      parentId: parentId && typeof parentId === "string" ? parentId : null,
      profundidad,
    },
    select: {
      id: true,
      contenido: true,
      autorNombre: true,
      esAdmin: true,
      estado: true,
      parentId: true,
      profundidad: true,
      creadoAt: true,
      actualizadoAt: true,
    },
  });

  return NextResponse.json(
    {
      ...comentario,
      respuestas: [],
      creadoAt: comentario.creadoAt.toISOString(),
      actualizadoAt: comentario.actualizadoAt.toISOString(),
    },
    { status: 201 }
  );
}
