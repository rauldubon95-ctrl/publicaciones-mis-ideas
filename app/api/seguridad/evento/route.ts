import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TIPOS_VALIDOS = new Set([
  "LOGIN_FALLIDO",
  "LOGIN_EXITOSO",
  "RATE_LIMIT",
  "BOT_DETECTADO",
  "ACCESO_DENEGADO",
  "SPAM",
  "SCAN_PATH",
  "INPUT_INVALIDO",
]);

export async function POST(req: NextRequest) {
  // Protección con token interno — solo el middleware puede llamar este endpoint
  const token = req.headers.get("x-internal-token");
  const esperado = process.env.INTERNAL_EVENT_TOKEN;
  if (!esperado || !token || token !== esperado) {
    return new NextResponse(null, { status: 204 });
  }

  try {
    const body = await req.json();
    const { tipo, ip, ruta, detalles } = body as {
      tipo?: string;
      ip?: string;
      ruta?: string;
      detalles?: Record<string, string>;
    };

    if (!tipo || !TIPOS_VALIDOS.has(tipo) || !ip) {
      return new NextResponse(null, { status: 204 });
    }

    await prisma.eventoSeguridad.create({
      data: {
        tipo,
        ip: ip.slice(0, 45),
        ruta: ruta?.slice(0, 200) ?? null,
        detalles: detalles ? JSON.stringify(detalles) : null,
      },
    });
  } catch {
    // Silencioso — el logging nunca rompe el flujo
  }

  return new NextResponse(null, { status: 204 });
}
