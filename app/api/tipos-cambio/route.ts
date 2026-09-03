import { NextResponse } from "next/server";
import { obtenerTiposCambio } from "@/lib/monedas-server";

export const runtime = "nodejs";

/**
 * Endpoint público de tipos de cambio.
 * GET /api/tipos-cambio → { base: "USD", tasas: {...}, actualizadoAt, fuente }
 *
 * La lógica real de fetch + cache está en `lib/monedas-server.ts`
 * (`obtenerTiposCambio`), compartida con los Server Components que muestran
 * precios convertidos sin necesidad de dar un round-trip por HTTP.
 *
 * Este endpoint queda expuesto por conveniencia: clientes externos (o el
 * propio JS del sitio si en el futuro se hace conversión client-side)
 * pueden consultarlo. Solo lee tasas públicas — no expone secretos.
 */
export async function GET() {
  const tasas = await obtenerTiposCambio();
  return NextResponse.json(tasas, {
    headers: {
      // El CDN puede aliviar carga entre revalidaciones.
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
