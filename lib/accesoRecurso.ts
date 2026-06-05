import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { LIMITE_DESCARGAS, dentroDeVentana, type ResultadoDescarga } from "@/lib/accesoComun";

function nombreCookie(recursoId: string): string {
  return `rec_${recursoId.slice(0, 16)}`;
}

// Acceso de LECTURA (ver el recurso en pantalla: visor HTML en iframe).
// Anti-reshare (sesión 21): la lectura es PERMANENTE — no se caduca, porque el
// comprador pagó por consultar el recurso. Solo la DESCARGA del archivo
// (consumirDescargaRecurso) está sujeta a caducidad + tope.
export async function tieneAccesoRecurso(recursoId: string): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(nombreCookie(recursoId))?.value;
  if (!token) return false;

  const pedido = await prisma.pedidoRecurso.findUnique({
    where: { tokenAcceso: token },
    select: { recursoId: true, estado: true },
  });
  if (!pedido || pedido.recursoId !== recursoId || pedido.estado !== "COMPLETADO") return false;

  prisma.pedidoRecurso
    .update({ where: { tokenAcceso: token }, data: { ultimoAccesoAt: new Date() } })
    .catch(() => {});

  return true;
}

// Acceso de DESCARGA (endpoint /api/recursos/[slug]/descargar). Valida compra,
// vigencia de la ventana y tope, y CONSUME una descarga de forma atómica. El
// incremento condicionado (descargas < LIMITE) en updateMany evita que dos
// peticiones simultáneas superen el tope. expiraAccesoAt null = legacy (sin tope
// ni caducidad). La lectura en pantalla NO pasa por aquí.
export async function consumirDescargaRecurso(recursoId: string): Promise<ResultadoDescarga> {
  const cookieStore = await cookies();
  const token = cookieStore.get(nombreCookie(recursoId))?.value;
  if (!token) return { ok: false, motivo: "sin-acceso" };

  const pedido = await prisma.pedidoRecurso.findUnique({
    where: { tokenAcceso: token },
    select: { recursoId: true, estado: true, expiraAccesoAt: true, descargas: true },
  });
  if (!pedido || pedido.recursoId !== recursoId || pedido.estado !== "COMPLETADO") {
    return { ok: false, motivo: "sin-acceso" };
  }
  if (!dentroDeVentana(pedido.expiraAccesoAt)) return { ok: false, motivo: "caducado" };
  if (pedido.descargas >= LIMITE_DESCARGAS) return { ok: false, motivo: "limite" };

  const r = await prisma.pedidoRecurso.updateMany({
    where: { tokenAcceso: token, estado: "COMPLETADO", descargas: { lt: LIMITE_DESCARGAS } },
    data: { descargas: { increment: 1 }, ultimoAccesoAt: new Date() },
  });
  if (r.count === 0) return { ok: false, motivo: "limite" };

  return { ok: true };
}
