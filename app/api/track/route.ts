import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Dispositivos detectables desde User-Agent
// Laptop vs escritorio: imposible distinguir — ambos envían la misma señal al servidor
function detectarDispositivo(ua: string): string {
  if (!ua) return "computadora";
  if (/ipad/i.test(ua)) return "tablet";
  if (/android/i.test(ua) && !/mobile/i.test(ua)) return "tablet";  // Android tablet
  if (/mobile|iphone|ipod|android|blackberry|windows phone/i.test(ua)) return "telefono";
  return "computadora";
}

// Hash de IP para deduplicación sin guardar la IP real (privacidad)
function hashIp(ip: string, contenidoId: string): string {
  return createHash("sha256").update(`${ip}:${contenidoId}`).digest("hex").slice(0, 32);
}

// Ventana de deduplicación: misma IP + mismo contenido dentro de 4 horas = 1 vista
const VENTANA_MS = 4 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      tipo?: string;
      contenidoId?: string;
    };

    const { tipo, contenidoId } = body;
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!contenidoId || typeof contenidoId !== "string" || !UUID_RE.test(contenidoId)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    if (!["publicacion", "recurso", "comic"].includes(tipo ?? "")) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const ip = req.headers.get("x-vercel-forwarded-for")
      ?? req.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim()
      ?? req.headers.get("x-real-ip")
      ?? "unknown";
    const pais = req.headers.get("x-vercel-ip-country") ?? null;
    const ua = req.headers.get("user-agent") ?? "";
    const dispositivo = detectarDispositivo(ua);
    const ipHash = hashIp(ip, contenidoId);
    const hace4h = new Date(Date.now() - VENTANA_MS);

    if (tipo === "publicacion") {
      const yaVisto = await prisma.vistaPublicacion.findFirst({
        where: { publicacionId: contenidoId, ipHash, creadoAt: { gte: hace4h } },
        select: { id: true },
      });
      if (!yaVisto) {
        await prisma.vistaPublicacion.create({
          data: { publicacionId: contenidoId, pais, dispositivo, ipHash },
        });
      }
    } else if (tipo === "recurso") {
      const yaVisto = await prisma.vistaRecurso.findFirst({
        where: { recursoId: contenidoId, ipHash, creadoAt: { gte: hace4h } },
        select: { id: true },
      });
      if (!yaVisto) {
        await prisma.vistaRecurso.create({
          data: { recursoId: contenidoId, pais, dispositivo, ipHash },
        });
      }
    } else if (tipo === "comic") {
      const yaVisto = await prisma.vistaComic.findFirst({
        where: { comicId: contenidoId, ipHash, creadoAt: { gte: hace4h } },
        select: { id: true },
      });
      if (!yaVisto) {
        await prisma.vistaComic.create({
          data: { comicId: contenidoId, pais, dispositivo, ipHash },
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
