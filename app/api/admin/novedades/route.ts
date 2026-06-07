import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized, unauthorizedResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const TIPOS_VALIDOS = ["articulo", "conferencia", "aviso"];

// GET: lista TODAS las novedades (activas e inactivas) para el panel admin.
export async function GET() {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();
  const novedades = await prisma.novedad.findMany({
    orderBy: [{ orden: "asc" }, { creadoAt: "desc" }],
  });
  return NextResponse.json(novedades);
}

// POST: crea una novedad.
export async function POST(req: NextRequest) {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const titulo = typeof body.titulo === "string" ? body.titulo.trim() : "";
  const url = typeof body.url === "string" ? body.url.trim() : "";
  const textoCorto = typeof body.textoCorto === "string" ? body.textoCorto.trim() : null;
  const tipo = typeof body.tipo === "string" && TIPOS_VALIDOS.includes(body.tipo) ? body.tipo : "articulo";
  const activo = body.activo !== false;
  const orden = Number.isFinite(body.orden) ? Number(body.orden) : 0;
  const expiraAt = typeof body.expiraAt === "string" && body.expiraAt ? new Date(body.expiraAt) : null;

  if (!titulo || titulo.length > 200) {
    return NextResponse.json({ error: "Título requerido (máx 200)" }, { status: 400 });
  }
  if (!/^https?:\/\/.+/.test(url) || url.length > 500) {
    return NextResponse.json({ error: "URL inválida (debe empezar con http:// o https://)" }, { status: 400 });
  }
  if (expiraAt && isNaN(expiraAt.getTime())) {
    return NextResponse.json({ error: "Fecha de caducidad inválida" }, { status: 400 });
  }

  const novedad = await prisma.novedad.create({
    data: { titulo, url, textoCorto: textoCorto || null, tipo, activo, orden, expiraAt },
  });
  // La home se actualiza por la revalidación de 5 min de getNovedades
  // (mismo patrón que el resto del contenido; ver CLAUDE.md).
  return NextResponse.json(novedad, { status: 201 });
}
