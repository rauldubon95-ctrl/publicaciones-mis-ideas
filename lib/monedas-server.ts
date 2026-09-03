// Helpers server-side para el sistema de conversión de moneda.
// Este archivo importa desde next/headers y next/cache, así que NO debe
// importarse desde componentes cliente (rompería el build). Los helpers
// puros (formateo, validación) viven en `lib/monedas.ts`.

import { cookies } from "next/headers";
import { unstable_cache } from "next/cache";
import { fetchConTimeout } from "@/lib/timeout";
import {
  CODIGOS_MONEDAS,
  TASAS_FALLBACK,
  MONEDA_DEFAULT,
  NOMBRE_COOKIE_MONEDA,
  esMonedaValida,
  tasasFallback,
  type TiposCambio,
} from "@/lib/monedas";

const CACHE_SEG = 24 * 60 * 60; // 24 horas
const URL_API = "https://open.er-api.com/v6/latest/USD";

interface RespuestaApiTasas {
  result: string;
  base_code: string;
  time_last_update_utc: string;
  rates: Record<string, number>;
}

/**
 * Consulta la API externa de tasas y devuelve solo las monedas soportadas.
 * Cacheado 24h vía unstable_cache. Fail-safe: si la API cae, devuelve el
 * snapshot fallback.
 *
 * SEGURIDAD:
 *   • Ejecución server-side; la IP del visitante NO llega a la API externa.
 *   • Solo lee tasas públicas — no expone secretos.
 *   • Timeout 8s → no bloquea el render si la API cae.
 *   • Filtramos SIEMPRE la respuesta a CODIGOS_MONEDAS conocidos (no
 *     confiamos en que el árbol devuelto sea limpio).
 */
export const obtenerTiposCambio = unstable_cache(
  async (): Promise<TiposCambio> => {
    try {
      const res = await fetchConTimeout(URL_API, {}, 8000);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as RespuestaApiTasas;
      if (data.result !== "success" || !data.rates) {
        throw new Error("Respuesta inesperada de la API de tasas");
      }
      const tasas: Record<string, number> = {};
      for (const codigo of CODIGOS_MONEDAS) {
        const tasa = data.rates[codigo];
        if (typeof tasa === "number" && Number.isFinite(tasa) && tasa > 0) {
          tasas[codigo] = tasa;
        } else {
          tasas[codigo] = TASAS_FALLBACK[codigo] ?? 1;
        }
      }
      return {
        base: "USD",
        tasas,
        actualizadoAt: data.time_last_update_utc ?? new Date().toISOString(),
        fuente: "api",
      };
    } catch (err) {
      console.warn("[tipos-cambio] API externa falló, usando fallback:", err);
      return tasasFallback();
    }
  },
  ["tipos-cambio-usd-v1"],
  { revalidate: CACHE_SEG, tags: ["tipos-cambio"] }
);

/**
 * Lee la moneda seleccionada por el visitante desde la cookie.
 * Valida el valor — si es basura, cae a MONEDA_DEFAULT (USD).
 */
export async function getMonedaSeleccionada(): Promise<string> {
  const cookieStore = await cookies();
  const valor = cookieStore.get(NOMBRE_COOKIE_MONEDA)?.value;
  return esMonedaValida(valor) ? valor : MONEDA_DEFAULT;
}
