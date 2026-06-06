import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized, unauthorizedResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();

  // Paginación: ?page (1-based) + ?pageSize (máx 50). Evita traer TODAS las
  // publicaciones de golpe cuando el catálogo crezca. La respuesta es un objeto
  // { items, total, page, pageSize } (el panel admin es su único consumidor).
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    50,
    Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10) || 20)
  );

  // select explícito: la lista del admin solo necesita estos campos. Antes un
  // `include` traía TODOS los campos —incluido el `contenido` completo de cada
  // artículo—, enviando megabytes de cuerpos de texto solo para listar títulos.
  const [items, total] = await Promise.all([
    prisma.publicacion.findMany({
      orderBy: { creadoAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        titulo: true,
        slug: true,
        publicado: true,
        creadoAt: true,
        categoria: { select: { nombre: true } },
        _count: { select: { comentarios: true, reacciones: true } },
      },
    }),
    prisma.publicacion.count(),
  ]);

  return NextResponse.json({ items, total, page, pageSize });
}
