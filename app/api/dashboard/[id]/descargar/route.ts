import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { tieneAccesoDashboard } from "@/lib/accesoDashboard";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// Proxy gateado al Excel almacenado en Supabase Storage.
// - Tableros NO premium: redirige al archivoUrl público sin más.
// - Tableros premium: valida admin o cookie de acceso, y solo entonces redirige.
// La URL del bucket en Supabase es pública, pero al esconderla detrás de este
// endpoint nadie llega a ella sin pasar por el muro de pago.
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

  return NextResponse.redirect(tablero.archivoUrl, { status: 302 });
}
