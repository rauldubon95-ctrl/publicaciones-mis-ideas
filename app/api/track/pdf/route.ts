import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { publicacionId } = await req.json() as { publicacionId?: string };
    if (!publicacionId || typeof publicacionId !== "string") {
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
