import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

// Anti-reshare para libros PDF de pago (sesión 20):
// - El acceso caduca a los VENTANA_ACCESO_DIAS de la compra.
// - Cada compra permite hasta LIMITE_DESCARGAS descargas.
// - expiraAccesoAt == null => pedido legacy (comprado antes de esta política):
//   conserva acceso permanente, sin tope, para no romper a quien ya pagó.
// El botón admin "Reenviar enlace" reinicia descargas y renueva la ventana.
export const VENTANA_ACCESO_DIAS = 30;
export const LIMITE_DESCARGAS = 5;

export function nuevaExpiracionAcceso(): Date {
  return new Date(Date.now() + VENTANA_ACCESO_DIAS * 24 * 60 * 60 * 1000);
}

// true si el pedido sigue dentro de su ventana de acceso.
// null (legacy) => siempre válido.
function dentroDeVentana(expiraAccesoAt: Date | null): boolean {
  return expiraAccesoAt === null || expiraAccesoAt > new Date();
}

function nombreCookie(libroId: string): string {
  return `lib_${libroId.slice(0, 16)}`;
}

// Acceso de LECTURA (mostrar el botón de descarga en la página del libro).
// No consume descargas; solo valida compra COMPLETADA y vigencia.
export async function tieneAccesoLibro(libroId: string): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(nombreCookie(libroId))?.value;
  if (!token) return false;

  const pedido = await prisma.pedidoLibro.findUnique({
    where: { tokenAcceso: token },
    select: { libroId: true, estado: true, expiraAccesoAt: true },
  });
  if (!pedido || pedido.libroId !== libroId || pedido.estado !== "COMPLETADO") return false;
  if (!dentroDeVentana(pedido.expiraAccesoAt)) return false;

  prisma.pedidoLibro
    .update({ where: { tokenAcceso: token }, data: { ultimoAccesoAt: new Date() } })
    .catch(() => {});

  return true;
}

export type ResultadoDescarga =
  | { ok: true }
  | { ok: false; motivo: "sin-acceso" | "caducado" | "limite" };

// Acceso de DESCARGA (endpoint /api/libros/[slug]/descargar). Valida compra,
// vigencia y tope, y CONSUME una descarga de forma atómica para evitar carreras.
// El incremento condicionado (descargas < LIMITE) en updateMany garantiza que
// dos peticiones simultáneas no superen el tope.
export async function consumirDescargaLibro(libroId: string): Promise<ResultadoDescarga> {
  const cookieStore = await cookies();
  const token = cookieStore.get(nombreCookie(libroId))?.value;
  if (!token) return { ok: false, motivo: "sin-acceso" };

  const pedido = await prisma.pedidoLibro.findUnique({
    where: { tokenAcceso: token },
    select: { libroId: true, estado: true, expiraAccesoAt: true, descargas: true },
  });
  if (!pedido || pedido.libroId !== libroId || pedido.estado !== "COMPLETADO") {
    return { ok: false, motivo: "sin-acceso" };
  }
  if (!dentroDeVentana(pedido.expiraAccesoAt)) {
    return { ok: false, motivo: "caducado" };
  }
  if (pedido.descargas >= LIMITE_DESCARGAS) {
    return { ok: false, motivo: "limite" };
  }

  const r = await prisma.pedidoLibro.updateMany({
    where: { tokenAcceso: token, estado: "COMPLETADO", descargas: { lt: LIMITE_DESCARGAS } },
    data: { descargas: { increment: 1 }, ultimoAccesoAt: new Date() },
  });
  if (r.count === 0) return { ok: false, motivo: "limite" };

  return { ok: true };
}
