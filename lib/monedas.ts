// Sistema de conversión de moneda REFERENCIAL para la interfaz del sitio.
//
// FILOSOFÍA DE SEGURIDAD:
//   • El cobro real SIEMPRE es en USD via PayPal — nunca cambia.
//   • Los precios en la DB (precioCentavos) están en centavos USD.
//   • La conversión que hace este módulo es puramente VISUAL/REFERENCIAL:
//     no se envía al endpoint /comprar, no afecta el pago real.
//   • La API externa (open.er-api.com) se consulta SIEMPRE server-side,
//     cacheada 24h vía unstable_cache. La IP del visitante nunca llega
//     a la API de tasas, y la moneda seleccionada por el visitante no
//     puede alterar los precios de cobro (que vienen del servidor).
//   • Si la API falla, usamos tasas FALLBACK hardcoded (última actualización
//     manual). Nunca dejamos al usuario sin precio referencial.
//
// ¿Por qué open.er-api.com y no otras?
//   • Sin API key (frankfurter.app no cubre COP, GTQ, PEN, ARS).
//   • Sin rate limit visible para uso razonable.
//   • Cubre 150+ monedas incluyendo todas las de América Latina.
//   • Devuelve tasas del día anterior (BCE + fuentes), suficiente para
//     referencia visual — no para trading.
//
// Fallback rates: snapshot conservador de referencia. Se actualizan
// automáticamente por la API en producción; el fallback solo se usa si
// la API cae. Un desvío del 5-10% en la conversión referencial es
// ACEPTABLE — el aviso legal en la UI dice "puede variar según tu banco".

/**
 * Definición de una moneda soportada.
 * `locale` se usa con Intl.NumberFormat para formatear el número.
 */
export interface Moneda {
  codigo: string; // ISO 4217
  nombre: string; // Nombre humano en español
  simbolo: string; // Símbolo para mostrar (ej. $, €, ₡)
  locale: string; // BCP-47 para Intl.NumberFormat
  bandera: string; // Emoji bandera
  paisPrincipal: string; // Ej. "México"
}

// Monedas soportadas. USD es la moneda REAL de cobro y siempre está.
// El orden importa: es el orden en que aparecen en el selector.
export const MONEDAS: Record<string, Moneda> = {
  USD: { codigo: "USD", nombre: "Dólar estadounidense", simbolo: "US$", locale: "en-US", bandera: "🇺🇸", paisPrincipal: "Estados Unidos" },
  MXN: { codigo: "MXN", nombre: "Peso mexicano",        simbolo: "MX$", locale: "es-MX", bandera: "🇲🇽", paisPrincipal: "México" },
  EUR: { codigo: "EUR", nombre: "Euro",                 simbolo: "€",   locale: "es-ES", bandera: "🇪🇺", paisPrincipal: "Zona euro" },
  COP: { codigo: "COP", nombre: "Peso colombiano",      simbolo: "CO$", locale: "es-CO", bandera: "🇨🇴", paisPrincipal: "Colombia" },
  GTQ: { codigo: "GTQ", nombre: "Quetzal guatemalteco", simbolo: "Q",   locale: "es-GT", bandera: "🇬🇹", paisPrincipal: "Guatemala" },
  ARS: { codigo: "ARS", nombre: "Peso argentino",       simbolo: "AR$", locale: "es-AR", bandera: "🇦🇷", paisPrincipal: "Argentina" },
  CLP: { codigo: "CLP", nombre: "Peso chileno",         simbolo: "CLP$",locale: "es-CL", bandera: "🇨🇱", paisPrincipal: "Chile" },
  PEN: { codigo: "PEN", nombre: "Sol peruano",          simbolo: "S/",  locale: "es-PE", bandera: "🇵🇪", paisPrincipal: "Perú" },
  BRL: { codigo: "BRL", nombre: "Real brasileño",       simbolo: "R$",  locale: "pt-BR", bandera: "🇧🇷", paisPrincipal: "Brasil" },
};

export const CODIGOS_MONEDAS = Object.keys(MONEDAS);
export const MONEDA_DEFAULT = "USD";
export const NOMBRE_COOKIE_MONEDA = "moneda_ref";

/**
 * Tasas fallback (última actualización manual). Se usan solo si la API
 * externa falla y no hay tasas en cache. Valores expresados como:
 *   "1 USD = X <moneda>"
 * Actualizar de vez en cuando ejecutando el endpoint /api/tipos-cambio.
 * Un desvío del 5-10% es aceptable — la conversión es referencial.
 */
export const TASAS_FALLBACK: Record<string, number> = {
  USD: 1.0,
  MXN: 17.0,
  EUR: 0.92,
  COP: 4100.0,
  GTQ: 7.80,
  ARS: 900.0,
  CLP: 900.0,
  PEN: 3.75,
  BRL: 5.10,
};

export interface TiposCambio {
  base: "USD";
  tasas: Record<string, number>; // { MXN: 17.5, EUR: 0.92, ... }
  actualizadoAt: string; // ISO timestamp
  fuente: "api" | "fallback"; // ¿de dónde vino?
}

/**
 * Valida que un código de moneda sea uno de los soportados.
 * Se usa en el selector y al leer la cookie del cliente para evitar
 * que un valor manipulado colapse el render.
 */
export function esMonedaValida(codigo: unknown): codigo is string {
  return typeof codigo === "string" && codigo in MONEDAS;
}

/**
 * Convierte un monto en centavos USD a un monto en la moneda destino.
 * Devuelve el monto en unidades enteras de la moneda destino (no centavos).
 */
export function convertirDesdeCentavosUSD(
  centavosUSD: number,
  monedaDestino: string,
  tasas: Record<string, number>
): number {
  const tasa = tasas[monedaDestino] ?? TASAS_FALLBACK[monedaDestino] ?? 1;
  const usd = centavosUSD / 100;
  return usd * tasa;
}

/**
 * Formatea un monto para mostrar. Usa Intl.NumberFormat con el locale
 * configurado por moneda. Se ajusta el número de decimales según la
 * convención de la moneda:
 *   - COP, CLP, ARS: 0 decimales (números grandes)
 *   - resto: 2 decimales
 */
export function formatearMoneda(
  monto: number,
  codigoMoneda: string
): string {
  const m = MONEDAS[codigoMoneda];
  if (!m) return `${monto.toFixed(2)} ${codigoMoneda}`;

  const sinDecimales = codigoMoneda === "COP" || codigoMoneda === "CLP" || codigoMoneda === "ARS";
  const opciones: Intl.NumberFormatOptions = {
    minimumFractionDigits: sinDecimales ? 0 : 2,
    maximumFractionDigits: sinDecimales ? 0 : 2,
  };

  try {
    const num = new Intl.NumberFormat(m.locale, opciones).format(monto);
    return `${m.simbolo}${num}`;
  } catch {
    // Fallback si el locale no está disponible en el runtime
    return `${m.simbolo}${monto.toFixed(sinDecimales ? 0 : 2)}`;
  }
}

/**
 * Devuelve el snapshot fallback como estructura TiposCambio.
 * Usado por el endpoint cuando la API externa falla.
 */
export function tasasFallback(): TiposCambio {
  return {
    base: "USD",
    tasas: { ...TASAS_FALLBACK },
    actualizadoAt: new Date().toISOString(),
    fuente: "fallback",
  };
}
