import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized, unauthorizedResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { toSlug } from "@/lib/utils";

export async function GET() {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();

  const servicios = await prisma.servicio.findMany({
    orderBy: [{ orden: "asc" }, { categoria: "asc" }, { titulo: "asc" }],
    include: { _count: { select: { cotizaciones: true } } },
  });

  return NextResponse.json(servicios);
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Formato inválido." }, { status: 400 });
  }

  const titulo = typeof body.titulo === "string" ? body.titulo.trim() : "";
  const descripcion = typeof body.descripcion === "string" ? body.descripcion.trim() : "";
  const categoria = typeof body.categoria === "string" ? body.categoria.trim() : "";
  const detalle = typeof body.detalle === "string" ? body.detalle.trim() : undefined;
  const icono = typeof body.icono === "string" ? body.icono.trim() : undefined;
  const activo = body.activo !== false;
  const orden = typeof body.orden === "number" ? body.orden : 0;

  if (!titulo) return NextResponse.json({ error: "El título es obligatorio." }, { status: 422 });
  if (!descripcion)
    return NextResponse.json({ error: "La descripción es obligatoria." }, { status: 422 });
  if (!categoria)
    return NextResponse.json({ error: "La categoría es obligatoria." }, { status: 422 });
  if (titulo.length > 120)
    return NextResponse.json({ error: "Título demasiado largo (máx 120)." }, { status: 422 });
  if (descripcion.length > 500)
    return NextResponse.json({ error: "Descripción demasiado larga (máx 500)." }, { status: 422 });

  const baseSlug = toSlug(titulo);
  let slug = baseSlug;
  let intento = 1;
  while (await prisma.servicio.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${intento++}`;
  }

  const servicio = await prisma.servicio.create({
    data: {
      titulo,
      slug,
      descripcion,
      detalle: detalle || null,
      categoria,
      icono: icono || null,
      activo,
      orden,
    },
  });

  return NextResponse.json(servicio, { status: 201 });
}
