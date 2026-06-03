// Enlace mágico de libro. Route Handler (no page) porque setear cookies solo es
// legal en Route Handlers / Server Actions en Next.js 15: hacerlo durante el
// render de una página lanza "Cookies can only be modified in a Server Action or
// Route Handler". Valida el tokenAcceso, setea la cookie de acceso y redirige al
// libro. Token inválido / compra no confirmada → redirige al catálogo.

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

  const pedido = await prisma.pedidoLibro.findUnique({
    where: { tokenAcceso: token },
    select: { estado: true, libroId: true, libro: { select: { slug: true } } },
  });

  if (!pedido || pedido.estado !== "COMPLETADO") {
    return NextResponse.redirect(new URL("/libros?acceso=invalido", req.url));
  }

  // Tracking suave del último acceso — fire-and-forget.
  prisma.pedidoLibro
    .update({ where: { tokenAcceso: token }, data: { ultimoAccesoAt: new Date() } })
    .catch(() => {});

  const res = NextResponse.redirect(new URL(`/libros/${pedido.libro.slug}`, req.url));
  res.cookies.set(`lib_${pedido.libroId.slice(0, 16)}`, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: UN_ANIO,
    path: "/",
  });
  return res;
}
