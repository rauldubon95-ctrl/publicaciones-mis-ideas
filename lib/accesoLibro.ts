import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

function nombreCookie(libroId: string): string {
  return `lib_${libroId.slice(0, 16)}`;
}

export async function tieneAccesoLibro(libroId: string): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(nombreCookie(libroId))?.value;
  if (!token) return false;

  const pedido = await prisma.pedidoLibro.findUnique({
    where: { tokenAcceso: token },
    select: { libroId: true, estado: true },
  });
  if (!pedido || pedido.libroId !== libroId || pedido.estado !== "COMPLETADO") return false;

  prisma.pedidoLibro
    .update({ where: { tokenAcceso: token }, data: { ultimoAccesoAt: new Date() } })
    .catch(() => {});

  return true;
}
