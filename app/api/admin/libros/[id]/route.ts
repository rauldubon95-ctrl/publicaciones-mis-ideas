import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized, unauthorizedResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { toSlug } from "@/lib/utils";
import { eliminarArchivoLibro } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();
  const { id } = await params;

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
    return NextResponse.json({ error: "El libro debe tener un PDF" }, { status: 400 });

  const existente = await prisma.libro.findUnique({ where: { id } });
  if (!existente) return NextResponse.json({ error: "Libro no encontrado" }, { status: 404 });

  const slugNuevo = toSlug(titulo);
  if (slugNuevo !== existente.slug) {
    const conflicto = await prisma.libro.findUnique({ where: { slug: slugNuevo } });
    if (conflicto) return NextResponse.json({ error: "Ya existe un libro con ese título" }, { status: 409 });
  }

  const libro = await prisma.libro.update({
    where: { id },
    data: {
      titulo: titulo.trim(),
      slug: slugNuevo,
      descripcion: descripcion.trim(),
      urlPdf,
      imagenPortada: typeof imagenPortada === "string" ? imagenPortada : null,
      paginas:       typeof paginas === "number" && paginas > 0 ? Math.floor(paginas) : null,
      precioCentavos: typeof precioCentavos === "number" && precioCentavos >= 0 ? Math.floor(precioCentavos) : null,
      publicado: !!publicado,
    },
  });
  return NextResponse.json(libro);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();
  const { id } = await params;

  const libro = await prisma.libro.findUnique({ where: { id } });
  if (!libro) return NextResponse.json({ error: "Libro no encontrado" }, { status: 404 });

  await prisma.libro.delete({ where: { id } });

  // Limpiar archivos de Storage en background
  if (libro.urlPdf) eliminarArchivoLibro(libro.urlPdf).catch(() => {});
  if (libro.imagenPortada) eliminarArchivoLibro(libro.imagenPortada).catch(() => {});

  return NextResponse.json({ ok: true });
}
