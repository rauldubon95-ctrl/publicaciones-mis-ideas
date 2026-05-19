import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toSlug } from "@/lib/utils";

function isAuthorized(): boolean {
  const cookieStore = cookies();
  const secret = process.env.ADMIN_SECRET;
  const token = cookieStore.get("admin_auth")?.value;
  return !!secret && !!token && verifySessionToken(token, secret);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthorized()) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { titulo, slug, resumen, contenido, publicado, categoriaId, etiquetas } = body;

  const existente = await prisma.publicacion.findUnique({ where: { id: params.id } });
  if (!existente) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  if (slug !== existente.slug) {
    const conflicto = await prisma.publicacion.findUnique({ where: { slug } });
    if (conflicto) {
      return NextResponse.json({ error: "Ya existe una publicación con ese slug" }, { status: 409 });
    }
  }

  await prisma.publicacionEtiqueta.deleteMany({ where: { publicacionId: params.id } });

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
    where: { id: params.id },
    data: {
      titulo,
      slug,
      resumen,
      contenido,
      publicado: !!publicado,
      publicadoAt: publicado && !existente.publicadoAt ? new Date() : existente.publicadoAt,
      categoriaId: categoriaId || null,
      etiquetas: { create: nuevasEtiquetas },
    },
  });

  return NextResponse.json(publicacion);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthorized()) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  await prisma.publicacion.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
