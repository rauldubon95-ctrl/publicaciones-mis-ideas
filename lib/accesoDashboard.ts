import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { LIMITE_DESCARGAS, dentroDeVentana, type ResultadoDescarga } from "@/lib/accesoComun";

function nombreCookie(tableroId: string): string {
  return `dash_${tableroId.slice(0, 16)}`;
}

// Acceso de LECTURA (ver el tablero en pantalla: tabla de datos + visor Office).
// Anti-reshare (sesión 21): la lectura es PERMANENTE — no se caduca. Solo la
// DESCARGA del Excel (consumirDescargaDashboard) está sujeta a caducidad + tope.
export async function tieneAccesoDashboard(tableroId: string): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(nombreCookie(tableroId))?.value;
  if (!token) return false;

  const pedido = await prisma.pedidoDashboard.findUnique({
    where: { tokenAcceso: token },
    select: { tableroId: true, estado: true },
  });
  if (!pedido || pedido.tableroId !== tableroId || pedido.estado !== "COMPLETADO") return false;

  prisma.pedidoDashboard
    .update({ where: { tokenAcceso: token }, data: { ultimoAccesoAt: new Date() } })
    .catch(() => {});

  return true;
}

// Acceso de DESCARGA (endpoint /api/dashboard/[id]/descargar). Valida compra,
// vigencia y tope, y CONSUME una descarga de forma atómica. expiraAccesoAt null
// = legacy (sin tope ni caducidad). La lectura en pantalla NO pasa por aquí.
export async function consumirDescargaDashboard(tableroId: string): Promise<ResultadoDescarga> {
  const cookieStore = await cookies();
  const token = cookieStore.get(nombreCookie(tableroId))?.value;
  if (!token) return { ok: false, motivo: "sin-acceso" };

  const pedido = await prisma.pedidoDashboard.findUnique({
    where: { tokenAcceso: token },
    select: { tableroId: true, estado: true, expiraAccesoAt: true, descargas: true },
  });
  if (!pedido || pedido.tableroId !== tableroId || pedido.estado !== "COMPLETADO") {
    return { ok: false, motivo: "sin-acceso" };
  }
  if (!dentroDeVentana(pedido.expiraAccesoAt)) return { ok: false, motivo: "caducado" };
  if (pedido.descargas >= LIMITE_DESCARGAS) return { ok: false, motivo: "limite" };

  const r = await prisma.pedidoDashboard.updateMany({
    where: { tokenAcceso: token, estado: "COMPLETADO", descargas: { lt: LIMITE_DESCARGAS } },
    data: { descargas: { increment: 1 }, ultimoAccesoAt: new Date() },
  });
  if (r.count === 0) return { ok: false, motivo: "limite" };

  return { ok: true };
}
