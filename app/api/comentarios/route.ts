import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Rate limiting simple: máx 3 comentarios por IP cada 10 minutos
const comentarioLog = new Map<string, { count: number; resetAt: number }>();

function checkComentarioRate(ip: string): boolean {
  const now = Date.now();
  const entry = comentarioLog.get(ip);
  if (!entry || entry.resetAt < now) {
    comentarioLog.set(ip, { count: 1, resetAt: now + 10 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 3) return false;
  entry.count++;
  return true;
}

function sanitizar(texto: string): string {
  return texto
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .trim();
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  if (!checkComentarioRate(ip)) {
    return NextResponse.json(
      { error: "Demasiados comentarios. Espera unos minutos." },
      { status: 429 }
    );
  }

  const body = await req.json();
  const { publicacionId, autorNombre, contenido } = body;

  if (!publicacionId || !autorNombre?.trim() || !contenido?.trim()) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  if (contenido.length > 1000 || autorNombre.length > 80) {
    return NextResponse.json({ error: "Contenido demasiado largo" }, { status: 400 });
  }

  const publicacion = await prisma.publicacion.findUnique({
    where: { id: publicacionId, publicado: true },
    select: { id: true },
  });

  if (!publicacion) {
    return NextResponse.json({ error: "Publicación no encontrada" }, { status: 404 });
  }

  const comentario = await prisma.comentario.create({
    data: {
      publicacionId,
      autorNombre: sanitizar(autorNombre),
      contenido: sanitizar(contenido),
    },
  });

  return NextResponse.json(comentario, { status: 201 });
}
