// Enlace mágico de dashboard premium. Route Handler (ver nota en
// app/leer/libro/[token]/route.ts sobre por qué no es una page).

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UN_ANIO = 365 * 24 * 60 * 60;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const pedido = await prisma.pedidoDashboard.findUnique({
    where: { tokenAcceso: token },
    select: { estado: true, tableroId: true, tablero: { select: { slug: true } } },
  });

  if (!pedido || pedido.estado !== "COMPLETADO") {
    return NextResponse.redirect(new URL("/dashboard?acceso=invalido", req.url));
  }

  prisma.pedidoDashboard
    .update({ where: { tokenAcceso: token }, data: { ultimoAccesoAt: new Date() } })
    .catch(() => {});

  const res = NextResponse.redirect(new URL(`/dashboard/${pedido.tablero.slug}`, req.url));
  res.cookies.set(`dash_${pedido.tableroId.slice(0, 16)}`, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: UN_ANIO,
    path: "/",
  });
  return res;
}
