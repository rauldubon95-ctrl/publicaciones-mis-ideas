import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { tieneAccesoRecurso } from "@/lib/accesoRecurso";
import { isAdminAuthorized } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

// Sirve el HTML del recurso con headers de seguridad estrictos.
// Se muestra en un <iframe sandbox> — los scripts del documento están completamente bloqueados.
// Si el recurso es premium, solo lo entregamos a admins o a quien tenga la cookie de acceso.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const recurso = await prisma.recursoHtml.findUnique({
    where: { slug, publicado: true },
    select: { id: true, contenido: true, titulo: true, esPremium: true },
  });

  if (!recurso) {
    return new NextResponse("No encontrado", { status: 404 });
  }

  if (recurso.esPremium) {
    const [admin, acceso] = await Promise.all([
      isAdminAuthorized(),
      tieneAccesoRecurso(recurso.id),
    ]);
    if (!admin && !acceso) {
      return new NextResponse("Pago requerido", { status: 402 });
    }
  }

  return new NextResponse(recurso.contenido, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Bloquea scripts, acceso al DOM padre y cualquier recurso externo no declarado
      "Content-Security-Policy": "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; object-src 'none'; base-uri 'none';",
      "X-Frame-Options": "SAMEORIGIN",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}
