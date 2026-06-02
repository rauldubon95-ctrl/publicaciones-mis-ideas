import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

function nombreCookie(tableroId: string): string {
  return `dash_${tableroId.slice(0, 16)}`;
}

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

export async function setearCookieAccesoDashboard(
  tableroId: string,
  tokenAcceso: string
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(nombreCookie(tableroId), tokenAcceso, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 365 * 24 * 60 * 60,
    path: "/",
  });
}
