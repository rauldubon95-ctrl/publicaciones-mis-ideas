import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { tieneAccesoRecurso } from "@/lib/accesoRecurso";
import { isAdminAuthorized } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const recurso = await prisma.recursoHtml.findUnique({
    where: { slug, publicado: true },
    select: { id: true, contenido: true, titulo: true, esPremium: true },
  });

  if (!recurso) return new NextResponse("No encontrado", { status: 404 });

  if (recurso.esPremium) {
    const [admin, acceso] = await Promise.all([
      isAdminAuthorized(),
      tieneAccesoRecurso(recurso.id),
    ]);
    if (!admin && !acceso) {
      return new NextResponse("Pago requerido", { status: 402 });
    }
  }

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
