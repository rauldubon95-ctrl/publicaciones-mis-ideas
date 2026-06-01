// Verificación de acceso a contenido premium.
//
// Hay dos formas en que un visitante demuestra que pagó por un artículo:
//
// 1. Cookie httpOnly con el tokenAcceso del PedidoContenido. La cookie se
//    setea cuando el visitante abre el enlace mágico /leer/[token] enviado
//    a su correo después del pago.
//
// 2. Pasa el token como query param `?acceso=<token>`. Útil para enviar el
//    enlace directo. Si el token es válido para esa publicación, se setea
//    la cookie y se valida la sesión.
//
// El admin siempre tiene acceso a todo (verificado en la página antes de
// llamar estos helpers).

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

// Nombre de la cookie por publicación. Una compra = acceso a UN artículo.
function nombreCookie(publicacionId: string): string {
  return `acc_${publicacionId.slice(0, 16)}`;
}

// Verifica si el visitante tiene un PedidoContenido COMPLETADO para esta
// publicación, leyendo la cookie correspondiente.
export async function tieneAccesoComprado(
  publicacionId: string
): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(nombreCookie(publicacionId))?.value;
  if (!token) return false;

  const pedido = await prisma.pedidoContenido.findUnique({
    where: { tokenAcceso: token },
    select: { publicacionId: true, estado: true },
  });
  if (!pedido) return false;
  if (pedido.publicacionId !== publicacionId) return false;
  if (pedido.estado !== "COMPLETADO") return false;

  // Tracking suave del último acceso — fire-and-forget
  prisma.pedidoContenido
    .update({
      where: { tokenAcceso: token },
      data: { ultimoAccesoAt: new Date() },
    })
    .catch(() => {});

  return true;
}

// Setea la cookie de acceso. Se llama desde /leer/[token] cuando el token es
// válido. Duración 1 año: el comprador puede volver a leer cuando quiera.
export async function setearCookieAcceso(
  publicacionId: string,
  tokenAcceso: string
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(nombreCookie(publicacionId), tokenAcceso, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // lax para que funcione al hacer click en el enlace del correo
    maxAge: 365 * 24 * 60 * 60,
    path: "/",
  });
}
