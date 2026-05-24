import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized, unauthorizedResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { toSlug } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();
  const comics = await prisma.comic.findMany({
    orderBy: { creadoAt: "desc" },
    include: { _count: { select: { paginas: true } } },
  });
  return NextResponse.json(comics);
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();

  const body = await req.json().catch(() => null);
  const { titulo, descripcion, publicado } = (body ?? {}) as Record<string, unknown>;

  if (
    typeof titulo !== "string" || !titulo.trim() || titulo.length > 200 ||
    typeof descripcion !== "string" || !descripcion.trim()
  ) {
    return NextResponse.json({ error: "Campos inválidos" }, { status: 400 });
  }

  const slug = toSlug(titulo);
  const existe = await prisma.comic.findUnique({ where: { slug } });
  if (existe) return NextResponse.json({ error: "Ya existe un cómic con ese título" }, { status: 409 });

  const comic = await prisma.comic.create({
    data: { titulo, slug, descripcion, publicado: !!publicado },
  });
  return NextResponse.json(comic, { status: 201 });
}
