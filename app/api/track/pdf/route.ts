import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { publicacionId } = await req.json() as { publicacionId?: string };
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!publicacionId || typeof publicacionId !== "string" || !UUID_RE.test(publicacionId)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const pais = req.headers.get("x-vercel-ip-country") ?? null;

    prisma.descargaPdf.create({
      data: { publicacionId, pais },
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
