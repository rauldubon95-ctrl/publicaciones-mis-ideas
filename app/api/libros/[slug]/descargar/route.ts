import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consumirDescargaLibro } from "@/lib/accesoLibro";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { descargarDesdeBucket, BUCKET_LIBROS } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const libro = await prisma.libro.findUnique({
    where: { slug, publicado: true },
    select: { id: true, urlPdf: true, precioCentavos: true },
  });

  if (!libro) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const esDePago = libro.precioCentavos != null && libro.precioCentavos > 0;

  if (esDePago) {
    // El admin descarga siempre y no consume tope. El comprador pasa por
    // consumirDescargaLibro: valida compra + vigencia + tope y suma 1 descarga.
    const adminOk = await isAdminAuthorized();
    if (!adminOk) {
      const r = await consumirDescargaLibro(libro.id);
      if (!r.ok) {
        if (r.motivo === "caducado") {
          return NextResponse.redirect(
            new URL(`/libros/${slug}?acceso=caducado`, req.url),
            { status: 302 }
          );
        }
        if (r.motivo === "limite") {
          return NextResponse.redirect(
            new URL(`/libros/${slug}?acceso=limite`, req.url),
            { status: 302 }
          );
        }
        return NextResponse.redirect(new URL(`/libros/${slug}`, req.url), { status: 302 });
      }
    }
  }

  const blob = await descargarDesdeBucket(BUCKET_LIBROS, libro.urlPdf);
  if (!blob) {
    return NextResponse.json({ error: "Archivo no disponible" }, { status: 404 });
  }

  const ua = req.headers.get("user-agent") ?? "";
  const dispositivo = /mobile|android|iphone|ipad/i.test(ua) ? "mobile" : "desktop";

  prisma.descargaLibro
    .create({ data: { libroId: libro.id, dispositivo } })
    .catch(() => {});

  // Stream del blob en vez de bufferizarlo con Buffer.from(arrayBuffer()): así
  // no se mantiene una segunda copia del archivo en memoria (reduce el pico de
  // RAM a la mitad bajo descargas concurrentes). Content-Length sale de blob.size.
  return new NextResponse(blob.stream(), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${slug}.pdf"`,
      "Content-Length": String(blob.size),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
