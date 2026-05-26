import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeCompare } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Solo accesible con token interno o desde Vercel Cron
  const token = req.headers.get("x-health-token");
  const esperado = process.env.HEALTH_TOKEN;
  if (!esperado || !token || !safeCompare(token, esperado)) {
    return NextResponse.json({ status: "ok" });
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", db: "connected" });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return NextResponse.json({ status: "error", db: "unreachable", error: err.message.slice(0, 100) }, { status: 500 });
  }
}
