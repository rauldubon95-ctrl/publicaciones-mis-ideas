import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest) {
  const cookieStore = cookies();
  const secret = process.env.ADMIN_SECRET;
  const token = cookieStore.get("admin_auth")?.value;

  if (!secret || !token || !(await verifySessionToken(token, secret))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const publicaciones = await prisma.publicacion.findMany({
    orderBy: { creadoAt: "desc" },
    include: {
      categoria: true,
      _count: { select: { comentarios: true, reacciones: true } },
    },
  });

  return NextResponse.json(publicaciones);
}
