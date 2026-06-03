// Verificación de acceso a contenido premium.
//
// Un visitante demuestra que pagó vía una cookie httpOnly con el tokenAcceso
// del PedidoContenido. La cookie la setea el Route Handler /leer/[token]
// (enlace mágico del correo) tras validar el token. Aquí solo se lee.
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
