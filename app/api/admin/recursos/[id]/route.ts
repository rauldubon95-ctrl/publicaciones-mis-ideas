import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized, unauthorizedResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const { titulo, descripcion, contenido, publicado, esPremium, precioCentavos, resumenPublico } =
    (body ?? {}) as Record<string, unknown>;

  if (
    typeof titulo !== "string" || !titulo.trim() ||
    typeof descripcion !== "string" || !descripcion.trim() ||
    typeof contenido !== "string" || !contenido.trim() || contenido.length > 2_000_000
  ) {
    return NextResponse.json({ error: "Campos inválidos" }, { status: 400 });
  }

  const premium = !!esPremium;
  const precio = typeof precioCentavos === "number" && precioCentavos >= 100 ? Math.round(precioCentavos) : null;
  if (premium && precio == null) {
    return NextResponse.json({ error: "El precio mínimo es $1.00 USD para recursos premium." }, { status: 400 });
  }
  const resumen = typeof resumenPublico === "string" && resumenPublico.trim()
    ? resumenPublico.trim().slice(0, 2000)
    : null;

  const recurso = await prisma.recursoHtml.update({
    where: { id },
    data: {
      titulo,
      descripcion,
      contenido,
      publicado: !!publicado,
      esPremium: premium,
      precioCentavos: premium ? precio : null,
      resumenPublico: resumen,
    },
  });
  return NextResponse.json(recurso);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();
  const { id } = await params;
  await prisma.recursoHtml.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
