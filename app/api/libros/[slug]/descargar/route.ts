import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getIp } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const libro = await prisma.libro.findUnique({
    where: { slug, publicado: true },
    select: { id: true, urlPdf: true },
  });

  if (!libro) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const ua = req.headers.get("user-agent") ?? "";
  const dispositivo = /mobile|android|iphone|ipad/i.test(ua) ? "mobile" : "desktop";

  // Registrar descarga en background — no bloquea la redirección
  prisma.descargaLibro
    .create({ data: { libroId: libro.id, dispositivo } })
    .catch(() => {});

  return NextResponse.redirect(libro.urlPdf, { status: 302 });
}
