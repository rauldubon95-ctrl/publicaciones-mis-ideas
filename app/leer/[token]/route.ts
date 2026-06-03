// Enlace mágico de artículo premium. Route Handler (ver nota en
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

  const pedido = await prisma.pedidoContenido.findUnique({
    where: { tokenAcceso: token },
    select: { estado: true, publicacionId: true, publicacion: { select: { slug: true } } },
  });

  if (!pedido || pedido.estado !== "COMPLETADO") {
    return NextResponse.redirect(new URL("/publicaciones?acceso=invalido", req.url));
  }

  prisma.pedidoContenido
    .update({ where: { tokenAcceso: token }, data: { ultimoAccesoAt: new Date() } })
    .catch(() => {});

  const res = NextResponse.redirect(
    new URL(`/publicaciones/${pedido.publicacion.slug}`, req.url)
  );
  res.cookies.set(`acc_${pedido.publicacionId.slice(0, 16)}`, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: UN_ANIO,
    path: "/",
  });
  return res;
}
