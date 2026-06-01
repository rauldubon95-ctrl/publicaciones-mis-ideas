import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized, unauthorizedResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { toSlug } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();
  const recursos = await prisma.recursoHtml.findMany({ orderBy: { creadoAt: "desc" } });
  return NextResponse.json(recursos);
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();

  const body = await req.json().catch(() => null);
  const { titulo, descripcion, contenido, publicado, esPremium, precioCentavos, resumenPublico } =
    (body ?? {}) as Record<string, unknown>;

  if (
    typeof titulo !== "string" || !titulo.trim() || titulo.length > 200 ||
    typeof descripcion !== "string" || !descripcion.trim() ||
    typeof contenido !== "string" || !contenido.trim() || contenido.length > 8_000_000
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

  const slug = toSlug(titulo);
  const existe = await prisma.recursoHtml.findUnique({ where: { slug } });
  if (existe) return NextResponse.json({ error: "Ya existe un recurso con ese título" }, { status: 409 });

  const recurso = await prisma.recursoHtml.create({
    data: {
      titulo,
      slug,
      descripcion,
      contenido,
      publicado: !!publicado,
      esPremium: premium,
      precioCentavos: premium ? precio : null,
      resumenPublico: resumen,
    },
  });
  return NextResponse.json(recurso, { status: 201 });
}
