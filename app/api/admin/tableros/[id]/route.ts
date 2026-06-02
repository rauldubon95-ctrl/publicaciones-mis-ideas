import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const BUCKET_DATOS = "datos";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => null) as {
    titulo?: string; descripcion?: string; categoria?: string;
    publicado?: boolean; orden?: number;
    esPremium?: boolean; precioCentavos?: number | null; resumenPublico?: string | null;
  } | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 });
  }

  // Si se intenta marcar premium sin precio válido nuevo, exigir que ya haya uno guardado.
  if (body.esPremium === true) {
    const precioNuevo = typeof body.precioCentavos === "number" ? body.precioCentavos : null;
    if (precioNuevo == null) {
      const actual = await prisma.tablero.findUnique({ where: { id }, select: { precioCentavos: true } });
      if (!actual?.precioCentavos || actual.precioCentavos < 100) {
        return NextResponse.json({ error: "El precio mínimo es $1.00 USD para tableros premium." }, { status: 400 });
      }
    } else if (precioNuevo < 100) {
      return NextResponse.json({ error: "El precio mínimo es $1.00 USD para tableros premium." }, { status: 400 });
    }
  }

  const tablero = await prisma.tablero.update({
    where: { id },
    data: {
      ...(body.titulo !== undefined && { titulo: body.titulo }),
      ...(body.descripcion !== undefined && { descripcion: body.descripcion }),
      ...(body.categoria !== undefined && { categoria: body.categoria }),
      ...(body.publicado !== undefined && { publicado: body.publicado }),
      ...(body.orden !== undefined && { orden: body.orden }),
      ...(body.esPremium !== undefined && { esPremium: body.esPremium }),
      ...(body.precioCentavos !== undefined && {
        precioCentavos: body.precioCentavos != null && body.precioCentavos >= 100 ? Math.round(body.precioCentavos) : null,
      }),
      ...(body.resumenPublico !== undefined && {
        resumenPublico: typeof body.resumenPublico === "string" && body.resumenPublico.trim()
          ? body.resumenPublico.trim().slice(0, 2000)
          : null,
      }),
    },
  });
  return NextResponse.json(tablero);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;

  const tablero = await prisma.tablero.findUnique({ where: { id }, select: { archivoUrl: true } });
  if (tablero) {
    // Eliminar archivo de Storage
    const sb = getSupabaseAdmin();
    const base = sb.storage.from(BUCKET_DATOS).getPublicUrl("").data.publicUrl;
    const ruta = tablero.archivoUrl.replace(base, "").replace(/^\//, "");
    if (ruta) await sb.storage.from(BUCKET_DATOS).remove([ruta]).catch(() => {});
  }

  await prisma.tablero.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
