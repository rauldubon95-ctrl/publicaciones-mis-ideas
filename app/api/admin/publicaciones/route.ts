import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized, unauthorizedResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest) {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();

  const publicaciones = await prisma.publicacion.findMany({
    orderBy: { creadoAt: "desc" },
    include: {
      categoria: true,
      _count: { select: { comentarios: true, reacciones: true } },
    },
  });

  return NextResponse.json(publicaciones);
}
