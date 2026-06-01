import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

function nombreCookie(recursoId: string): string {
  return `rec_${recursoId.slice(0, 16)}`;
}

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

export async function setearCookieAccesoRecurso(
  recursoId: string,
  tokenAcceso: string
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(nombreCookie(recursoId), tokenAcceso, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 365 * 24 * 60 * 60,
    path: "/",
  });
}
