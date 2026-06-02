import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { tieneAccesoDashboard } from "@/lib/accesoDashboard";
import { descargarDesdeBucket, BUCKET_DATOS } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// Proxy gateado al Excel almacenado en Supabase Storage.
// - Tableros NO premium: cualquiera puede descargar.
// - Tableros premium: valida admin o cookie de acceso.
// El servidor reenvía el archivo (stream) en vez de redirigir a la URL pública
// del bucket, de modo que el enlace permanente nunca se entrega al cliente y no
// puede recompartirse. Ver H1 en docs/auditoria-seguridad-2026-06-02.md.
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const tablero = await prisma.tablero.findFirst({
    where: { OR: [{ id }, { slug: id }], publicado: true },
    select: { id: true, archivoUrl: true, archivoNombre: true, esPremium: true, precioCentavos: true },
  });

  if (!tablero) return new NextResponse("No encontrado", { status: 404 });

  const esPremium = tablero.esPremium && (tablero.precioCentavos ?? 0) > 0;
  if (esPremium) {
    const [admin, acceso] = await Promise.all([
      isAdminAuthorized(),
      tieneAccesoDashboard(tablero.id),
    ]);
    if (!admin && !acceso) {
      return new NextResponse("Pago requerido", { status: 402 });
    }
  }

  const blob = await descargarDesdeBucket(BUCKET_DATOS, tablero.archivoUrl);
  if (!blob) return new NextResponse("Archivo no disponible", { status: 404 });

  const nombre = (tablero.archivoNombre || "dashboard.xlsx").replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const buffer = Buffer.from(await blob.arrayBuffer());
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": XLSX_MIME,
      "Content-Disposition": `attachment; filename="${nombre}"`,
      "Content-Length": String(buffer.byteLength),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
