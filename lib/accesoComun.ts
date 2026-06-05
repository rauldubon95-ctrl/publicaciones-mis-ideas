// Constantes y helpers compartidos del anti-reshare de contenido de pago.
//
// Fuente única de verdad para la política de caducidad + tope de descargas que
// aplican libros, recursos y dashboards. Antes vivía duplicada en
// lib/accesoLibro.ts; ahora todos los helpers de acceso la importan de aquí.
//
// Semántica por tipo de contenido (decisión de producto, sesión 21):
// - Libros: leer == descargar → la ventana y el tope rigen el acceso completo.
// - Recursos / Dashboards: la LECTURA en pantalla es permanente; la ventana y el
//   tope SOLO limitan la descarga del archivo (endpoint /descargar).
// - Artículos: no hay archivo → solo caduca la LECTURA, sin tope de descargas.
//
// expiraAccesoAt == null => pedido legacy (comprado antes de esta política):
// conserva acceso permanente, sin tope, para no romper a quien ya pagó.

export const VENTANA_ACCESO_DIAS = 30;
export const LIMITE_DESCARGAS = 5;

export function nuevaExpiracionAcceso(): Date {
  return new Date(Date.now() + VENTANA_ACCESO_DIAS * 24 * 60 * 60 * 1000);
}

// true si el pedido sigue dentro de su ventana de acceso.
// null (legacy) => siempre válido.
export function dentroDeVentana(expiraAccesoAt: Date | null): boolean {
  return expiraAccesoAt === null || expiraAccesoAt > new Date();
}

export type ResultadoDescarga =
  | { ok: true }
  | { ok: false; motivo: "sin-acceso" | "caducado" | "limite" };
