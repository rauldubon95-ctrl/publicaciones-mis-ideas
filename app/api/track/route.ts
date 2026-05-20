import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function detectarDispositivo(ua: string): string {
  if (/mobile|android|iphone|ipad/i.test(ua)) return "mobile";
  if (/tablet|ipad/i.test(ua)) return "tablet";
  return "desktop";
}

export async function POST(req: NextRequest) {
  try {
    const { publicacionId } = await req.json() as { publicacionId?: string };
    if (!publicacionId || typeof publicacionId !== "string") {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const pais = req.headers.get("x-vercel-ip-country") ?? null;
    const ua = req.headers.get("user-agent") ?? "";
    const dispositivo = detectarDispositivo(ua);

    // Fire and forget — no bloqueamos la respuesta
    prisma.vistaPublicacion.create({
      data: { publicacionId, pais, dispositivo },
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
