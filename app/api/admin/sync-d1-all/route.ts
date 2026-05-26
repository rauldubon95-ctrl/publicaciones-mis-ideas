import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized, unauthorizedResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { syncPublicacionToD1 } from "@/lib/d1Sync";

export async function POST(_req: NextRequest) {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();

  const publicaciones = await prisma.publicacion.findMany({
    where: { publicado: true },
    include: {
      etiquetas: { include: { etiqueta: true } },
      categoria: true,
    },
  });

  const resultados: { slug: string; ok: boolean; error?: string }[] = [];

  for (const pub of publicaciones) {
    try {
      await syncPublicacionToD1(
        {
          slug: pub.slug,
          titulo: pub.titulo,
          contenido: pub.contenido,
          resumen: pub.resumen ?? undefined,
          etiquetas: pub.etiquetas.map((e) => e.etiqueta.nombre),
          categoria: pub.categoria?.nombre ?? undefined,
        },
        "upsert"
      );
      resultados.push({ slug: pub.slug, ok: true });
    } catch (err) {
      resultados.push({ slug: pub.slug, ok: false, error: String(err) });
    }
  }

  const exitosos = resultados.filter((r) => r.ok).length;
  const fallidos = resultados.filter((r) => !r.ok).length;

  return NextResponse.json({
    total: publicaciones.length,
    exitosos,
    fallidos,
    resultados,
  });
}
