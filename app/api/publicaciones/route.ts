import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toSlug } from "@/lib/utils";

export async function GET() {
  const publicaciones = await prisma.publicacion.findMany({
    where: { publicado: true },
    orderBy: { publicadoAt: "desc" },
    include: {
      categoria: true,
      etiquetas: { include: { etiqueta: true } },
      _count: { select: { comentarios: true, reacciones: true } },
    },
  });
  return NextResponse.json(publicaciones);
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const secret = process.env.ADMIN_SECRET;
  const token = cookieStore.get("admin_auth")?.value;

  if (!secret || !token || !(await verifySessionToken(token, secret))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { titulo, slug, resumen, contenido, publicado, categoriaId, etiquetas } = body;

  if (!titulo || !resumen || !contenido) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  const finalSlug = toSlug(slug || titulo);

  const existente = await prisma.publicacion.findUnique({ where: { slug: finalSlug } });
  if (existente) {
    return NextResponse.json({ error: "Ya existe una publicación con ese slug" }, { status: 409 });
  }

  const publicacion = await prisma.publicacion.create({
    data: {
      titulo,
      slug: finalSlug,
      resumen,
      contenido,
      publicado: !!publicado,
      publicadoAt: publicado ? new Date() : null,
      categoriaId: categoriaId || null,
      etiquetas: etiquetas?.length
        ? {
            create: await Promise.all(
              (etiquetas as string[]).map(async (nombre: string) => {
                const etSlug = toSlug(nombre);
                const etiqueta = await prisma.etiqueta.upsert({
                  where: { slug: etSlug },
                  update: {},
                  create: { nombre, slug: etSlug },
                });
                return { etiquetaId: etiqueta.id };
              })
            ),
          }
        : undefined,
    },
  });

  return NextResponse.json(publicacion, { status: 201 });
}
