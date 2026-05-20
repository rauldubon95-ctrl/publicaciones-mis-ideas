import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized, unauthorizedResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { toSlug } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();
  const recursos = await prisma.recursoHtml.findMany({ orderBy: { creadoAt: "desc" } });
  return NextResponse.json(recursos);
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();

  const body = await req.json().catch(() => null);
  const { titulo, descripcion, contenido, publicado } = (body ?? {}) as Record<string, unknown>;

  if (
    typeof titulo !== "string" || !titulo.trim() || titulo.length > 200 ||
    typeof descripcion !== "string" || !descripcion.trim() ||
    typeof contenido !== "string" || !contenido.trim() || contenido.length > 2_000_000
  ) {
    return NextResponse.json({ error: "Campos inválidos" }, { status: 400 });
  }

  const slug = toSlug(titulo);
  const existe = await prisma.recursoHtml.findUnique({ where: { slug } });
  if (existe) return NextResponse.json({ error: "Ya existe un recurso con ese título" }, { status: 409 });

  const recurso = await prisma.recursoHtml.create({
    data: { titulo, slug, descripcion, contenido, publicado: !!publicado },
  });
  return NextResponse.json(recurso, { status: 201 });
}
