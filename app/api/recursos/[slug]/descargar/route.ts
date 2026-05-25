import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const recurso = await prisma.recursoHtml.findUnique({
    where: { slug, publicado: true },
    select: { contenido: true, titulo: true },
  });

  if (!recurso) return new NextResponse("No encontrado", { status: 404 });

  const nombre = `${slug}.html`;
  return new NextResponse(recurso.contenido, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nombre}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
