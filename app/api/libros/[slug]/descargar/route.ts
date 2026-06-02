import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { tieneAccesoLibro } from "@/lib/accesoLibro";
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
    const [adminOk, acceso] = await Promise.all([
      isAdminAuthorized(),
      tieneAccesoLibro(libro.id),
    ]);
    if (!adminOk && !acceso) {
      return NextResponse.redirect(new URL(`/libros/${slug}`, req.url), { status: 302 });
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

  const buffer = Buffer.from(await blob.arrayBuffer());
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${slug}.pdf"`,
      "Content-Length": String(buffer.byteLength),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
