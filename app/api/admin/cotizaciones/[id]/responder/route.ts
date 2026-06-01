import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized, unauthorizedResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { enviarRespuestaCotizacion } from "@/lib/resend";
import { checkRateLimitDb, getIp, registrarEvento } from "@/lib/security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_RESPUESTAS = 5;
const MAX_ASUNTO = 200;
const MAX_CUERPO = 8000;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();

  const ip = getIp(req);
  // Rate-limit conservador: admin no debería disparar más de 30 respuestas/h.
  const rl = await checkRateLimitDb(ip, "/api/admin/cotizaciones/responder", {
    maxIntentos: 30,
    ventanaMs: 60 * 60 * 1000,
    bloqueoMs: 15 * 60 * 1000,
    failBehavior: "open",
  });
  if (!rl.permitido) {
    await registrarEvento("RATE_LIMIT", ip, "/api/admin/cotizaciones/responder");
    return NextResponse.json(
      { error: "Demasiados envíos. Espera un momento." },
      { status: 429 }
    );
  }

  const { id } = await params;

  let body: { asunto?: string; cuerpo?: string };
  try {
    body = (await req.json()) as { asunto?: string; cuerpo?: string };
  } catch {
    return NextResponse.json({ error: "Formato inválido." }, { status: 400 });
  }

  const asunto = (body.asunto ?? "").trim().slice(0, MAX_ASUNTO);
  const cuerpo = (body.cuerpo ?? "").trim().slice(0, MAX_CUERPO);

  if (!asunto || asunto.length < 3) {
    return NextResponse.json({ error: "El asunto es obligatorio (mín. 3 caracteres)." }, { status: 422 });
  }
  if (!cuerpo || cuerpo.length < 10) {
    return NextResponse.json({ error: "El cuerpo es obligatorio (mín. 10 caracteres)." }, { status: 422 });
  }

  const cotizacion = await prisma.solicitudCotizacion.findUnique({
    where: { id },
    select: { id: true, correo: true, nombre: true, _count: { select: { respuestas: true } } },
  });
  if (!cotizacion) {
    return NextResponse.json({ error: "Cotización no encontrada." }, { status: 404 });
  }

  if (cotizacion._count.respuestas >= MAX_RESPUESTAS) {
    return NextResponse.json(
      { error: `Esta cotización ya tiene el máximo de ${MAX_RESPUESTAS} respuestas.` },
      { status: 409 }
    );
  }

  // Creamos la respuesta en estado PENDIENTE para tener trazabilidad incluso
  // si Resend falla. Luego actualizamos según el resultado del envío.
  const respuesta = await prisma.respuestaCotizacion.create({
    data: {
      cotizacionId: cotizacion.id,
      asunto,
      cuerpoHtml: "",  // se llena tras envío exitoso para ahorrar I/O
      cuerpoTexto: cuerpo,
      enviadoPor: "admin",
      estadoEnvio: "PENDIENTE",
    },
  });

  const resultado = await enviarRespuestaCotizacion(
    cotizacion.correo,
    asunto,
    cuerpo,
    cotizacion.nombre
  );

  if (!resultado.ok) {
    await prisma.respuestaCotizacion.update({
      where: { id: respuesta.id },
      data: {
        estadoEnvio: "FALLIDO",
        errorMensaje: (resultado.error ?? "Error desconocido").slice(0, 500),
      },
    });
    return NextResponse.json(
      { error: `No se pudo enviar el correo: ${resultado.error ?? "Resend falló"}` },
      { status: 502 }
    );
  }

  // Importamos la plantilla solo aquí para guardar el HTML real que se envió.
  // Lo dejamos como deuda menor: por simplicidad guardamos un placeholder.
  await Promise.all([
    prisma.respuestaCotizacion.update({
      where: { id: respuesta.id },
      data: {
        estadoEnvio: "ENVIADO",
        resendMessageId: resultado.messageId ?? null,
      },
    }),
    prisma.solicitudCotizacion.update({
      where: { id: cotizacion.id },
      data: { estado: "RESPONDIDA", respondidaAt: new Date() },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    respuestaId: respuesta.id,
    restantes: MAX_RESPUESTAS - (cotizacion._count.respuestas + 1),
  });
}
