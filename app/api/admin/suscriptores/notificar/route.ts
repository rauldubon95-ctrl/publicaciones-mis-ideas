import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized, unauthorizedResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { enviarNuevaPublicacion } from "@/lib/resend";

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();

  let body: { publicacionId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Formato inválido." }, { status: 400 });
  }

  if (!body.publicacionId || typeof body.publicacionId !== "string") {
    return NextResponse.json({ error: "publicacionId requerido." }, { status: 400 });
  }

  const publicacion = await prisma.publicacion.findUnique({
    where: { id: body.publicacionId, publicado: true },
    select: { id: true, titulo: true, resumen: true, slug: true },
  });

  if (!publicacion) {
    return NextResponse.json(
      { error: "Publicación no encontrada o no está publicada." },
      { status: 404 }
    );
  }

  const suscriptores = await prisma.subscription.findMany({
    where: { status: "ACTIVE" },
    select: { email: true, nombre: true, token: true },
  });

  if (suscriptores.length === 0) {
    return NextResponse.json({ ok: true, enviados: 0, fallidos: 0 });
  }

  // Enviar en lotes de 10 para no saturar la API de Resend
  const LOTE = 10;
  let enviados = 0;
  let fallidos = 0;

  for (let i = 0; i < suscriptores.length; i += LOTE) {
    const lote = suscriptores.slice(i, i + LOTE);
    const resultados = await Promise.allSettled(
      lote.map((s) =>
        enviarNuevaPublicacion(
          s.email,
          s.token,
          publicacion.titulo,
          publicacion.resumen,
          publicacion.slug,
          s.nombre
        )
      )
    );
    for (const r of resultados) {
      if (r.status === "fulfilled" && r.value) enviados++;
      else fallidos++;
    }
  }

  // Registrar el envío para analítica (Fase 7)
  await prisma.emailEnvio.create({
    data: {
      asunto: publicacion.titulo,
      publicacionId: publicacion.id,
      totalEnviados: enviados,
    },
  });

  return NextResponse.json({ ok: true, enviados, fallidos, total: suscriptores.length });
}
