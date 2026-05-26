import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized, unauthorizedResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { toSlug } from "@/lib/utils";
import { syncPublicacionToD1 } from "@/lib/d1Sync";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();
  const { id } = await params;

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }
  const { titulo, slug, resumen, contenido, publicado, categoriaId, etiquetas } =
    body as Record<string, unknown>;

  if (
    typeof titulo !== "string" || titulo.trim().length === 0 || titulo.length > 200 ||
    typeof slug !== "string" || slug.trim().length === 0 || slug.length > 200 ||
    typeof resumen !== "string" || resumen.trim().length === 0 || resumen.length > 500 ||
    typeof contenido !== "string" || contenido.trim().length === 0 || contenido.length > 100000
  ) {
    return NextResponse.json({ error: "Campos inválidos o demasiado largos" }, { status: 400 });
  }
  if (etiquetas !== undefined && !Array.isArray(etiquetas)) {
    return NextResponse.json({ error: "Etiquetas debe ser un array" }, { status: 400 });
  }

  const existente = await prisma.publicacion.findUnique({ where: { id } });
  if (!existente) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const slugNormalizado = toSlug(slug);

  if (slugNormalizado !== existente.slug) {
    const conflicto = await prisma.publicacion.findUnique({ where: { slug: slugNormalizado } });
    if (conflicto) {
      return NextResponse.json({ error: "Ya existe una publicación con ese slug" }, { status: 409 });
    }
  }

  await prisma.publicacionEtiqueta.deleteMany({ where: { publicacionId: id } });

  const nuevasEtiquetas = etiquetas?.length
    ? await Promise.all(
        (etiquetas as string[]).map(async (nombre: string) => {
          const etSlug = toSlug(nombre);
          const etiqueta = await prisma.etiqueta.upsert({
            where: { slug: etSlug },
            update: {},
            create: { nombre, slug: etSlug },
          });
          return { etiquetaId: etiqueta.id };
        })
      )
    : [];

  const publicacion = await prisma.publicacion.update({
    where: { id },
    data: {
      titulo,
      slug: slugNormalizado,
      resumen,
      contenido,
      publicado: !!publicado,
      publicadoAt: publicado && !existente.publicadoAt ? new Date() : existente.publicadoAt,
      categoriaId: categoriaId || null,
      etiquetas: { create: nuevasEtiquetas },
    },
  });

  // Sync a D1 en background — no bloquea la respuesta al admin
  const syncAction = publicacion.publicado ? "upsert" : "delete";
  syncPublicacionToD1(
    {
      slug: publicacion.slug,
      titulo: publicacion.titulo,
      contenido: publicacion.contenido,
      resumen: publicacion.resumen,
      etiquetas: etiquetas as string[] | undefined,
    },
    syncAction
  ).catch(() => {});

  return NextResponse.json(publicacion);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();
  const { id } = await params;

  await prisma.publicacion.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
