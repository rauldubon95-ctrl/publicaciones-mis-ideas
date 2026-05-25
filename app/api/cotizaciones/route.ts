import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimitDb,
  registrarEvento,
  sanitizarTexto,
  getIp,
} from "@/lib/security";

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
const HONEYPOT_FIELD = "website";

function hashIp(ip: string): Promise<string> {
  return crypto.subtle
    .digest("SHA-256", new TextEncoder().encode(ip + ":cotizacion"))
    .then((buf) =>
      Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
        .slice(0, 32)
    );
}

export async function POST(req: NextRequest) {
  const ip = getIp(req);

  // Rate limit: 3 solicitudes por 30 minutos (fail-close — crítico para evitar spam)
  const rl = await checkRateLimitDb(ip, "/api/cotizaciones", {
    maxIntentos: 3,
    ventanaMs: 30 * 60 * 1000,
    bloqueoMs: 60 * 60 * 1000,
    failBehavior: "close",
  });

  if (!rl.permitido) {
    await registrarEvento("RATE_LIMIT", ip, "/api/cotizaciones");
    return NextResponse.json(
      { error: "Demasiados intentos. Espera un momento antes de intentar de nuevo." },
      { status: 429 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Formato inválido." }, { status: 400 });
  }

  // Honeypot anti-bot: el campo debe estar vacío en envíos humanos
  if (body[HONEYPOT_FIELD]) {
    await registrarEvento("BOT_DETECTADO", ip, "/api/cotizaciones", {
      motivo: "honeypot",
    });
    // Respuesta silenciosa — no revelar la detección al bot
    return NextResponse.json({ ok: true });
  }

  // Validación de campos requeridos
  const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
  const correo = typeof body.correo === "string" ? body.correo.trim().toLowerCase() : "";
  const descripcion = typeof body.descripcion === "string" ? body.descripcion.trim() : "";
  const organizacion = typeof body.organizacion === "string" ? body.organizacion.trim() : undefined;
  const tipoServicio = typeof body.tipoServicio === "string" ? body.tipoServicio.trim() : undefined;
  const presupuesto = typeof body.presupuesto === "string" ? body.presupuesto.trim() : undefined;
  const servicioId = typeof body.servicioId === "string" && body.servicioId ? body.servicioId : undefined;

  const errores: string[] = [];
  if (!nombre || nombre.length < 2) errores.push("El nombre es obligatorio.");
  if (nombre.length > 100) errores.push("El nombre no puede superar 100 caracteres.");
  if (!correo || !EMAIL_RE.test(correo)) errores.push("El correo electrónico no es válido.");
  if (correo.length > 200) errores.push("El correo no puede superar 200 caracteres.");
  if (!descripcion || descripcion.length < 10)
    errores.push("La descripción debe tener al menos 10 caracteres.");
  if (descripcion.length > 2000)
    errores.push("La descripción no puede superar 2000 caracteres.");
  if (organizacion && organizacion.length > 150)
    errores.push("La organización no puede superar 150 caracteres.");
  if (tipoServicio && tipoServicio.length > 150)
    errores.push("El tipo de servicio no puede superar 150 caracteres.");
  if (presupuesto && presupuesto.length > 100)
    errores.push("El presupuesto no puede superar 100 caracteres.");

  if (errores.length > 0) {
    await registrarEvento("INPUT_INVALIDO", ip, "/api/cotizaciones", { errores });
    return NextResponse.json({ error: errores.join(" ") }, { status: 422 });
  }

  // Verificar que el servicioId existe si fue enviado
  if (servicioId) {
    const existe = await prisma.servicio.findUnique({
      where: { id: servicioId },
      select: { id: true },
    });
    if (!existe) {
      return NextResponse.json({ error: "Servicio no encontrado." }, { status: 404 });
    }
  }

  const solicitud = await prisma.solicitudCotizacion.create({
    data: {
      nombre: sanitizarTexto(nombre),
      correo,
      organizacion: organizacion ? sanitizarTexto(organizacion) : null,
      servicioId: servicioId ?? null,
      tipoServicio: tipoServicio ? sanitizarTexto(tipoServicio) : null,
      descripcion: sanitizarTexto(descripcion),
      presupuesto: presupuesto ? sanitizarTexto(presupuesto) : null,
      ipHash: await hashIp(ip),
    },
  });

  return NextResponse.json({ ok: true, id: solicitud.id }, { status: 201 });
}
