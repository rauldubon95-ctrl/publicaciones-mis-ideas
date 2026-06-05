import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consumirDescargaRecurso } from "@/lib/accesoRecurso";
import { isAdminAuthorized } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const recurso = await prisma.recursoHtml.findUnique({
    where: { slug, publicado: true },
    select: { id: true, contenido: true, titulo: true, esPremium: true },
  });

  if (!recurso) return new NextResponse("No encontrado", { status: 404 });

  // El admin descarga siempre y no consume tope. El comprador pasa por
  // consumirDescargaRecurso: valida compra + vigencia + tope y suma 1 descarga.
  // La lectura en pantalla (visor HTML) sigue siendo permanente; solo esta
  // descarga del archivo está limitada (anti-reshare, sesión 21).
  if (recurso.esPremium) {
    const adminOk = await isAdminAuthorized();
    if (!adminOk) {
      const r = await consumirDescargaRecurso(recurso.id);
      if (!r.ok) {
        if (r.motivo === "caducado" || r.motivo === "limite") {
          return NextResponse.redirect(
            new URL(`/recursos/${slug}?acceso=${r.motivo}`, req.url),
            { status: 302 }
          );
        }
        return new NextResponse("Pago requerido", { status: 402 });
      }
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
