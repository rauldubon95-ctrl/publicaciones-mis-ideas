import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized, unauthorizedResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { toSlug } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();
  const libros = await prisma.libro.findMany({
    orderBy: { creadoAt: "desc" },
    include: { _count: { select: { descargas: true } } },
  });
  return NextResponse.json(libros);
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  }

  const { titulo, descripcion, urlPdf, imagenPortada, paginas, precioCentavos, publicado } = body;

  if (typeof titulo !== "string" || !titulo.trim() || titulo.length > 200)
    return NextResponse.json({ error: "Título inválido" }, { status: 400 });
  if (typeof descripcion !== "string" || !descripcion.trim() || descripcion.length > 2000)
    return NextResponse.json({ error: "Descripción inválida (máx. 2000 caracteres)" }, { status: 400 });
  if (typeof urlPdf !== "string" || !urlPdf.startsWith("http"))
    return NextResponse.json({ error: "Sube el PDF antes de guardar" }, { status: 400 });

  const slug = toSlug(titulo);
  const existe = await prisma.libro.findUnique({ where: { slug } });
  if (existe) return NextResponse.json({ error: "Ya existe un libro con ese título" }, { status: 409 });

  const libro = await prisma.libro.create({
    data: {
      titulo: titulo.trim(),
      slug,
      descripcion: descripcion.trim(),
      urlPdf,
      imagenPortada: typeof imagenPortada === "string" ? imagenPortada : null,
      paginas:       typeof paginas === "number" && paginas > 0 ? Math.floor(paginas) : null,
      precioCentavos: typeof precioCentavos === "number" && precioCentavos >= 0 ? Math.floor(precioCentavos) : null,
      publicado:     !!publicado,
    },
  });
  return NextResponse.json(libro, { status: 201 });
}
