import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const directUrlSet = !!process.env.DIRECT_URL;
  const dbUrlSet = !!process.env.DATABASE_URL;
  const directUrlLen = process.env.DIRECT_URL?.length ?? 0;
  const dbUrlLen = process.env.DATABASE_URL?.length ?? 0;

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      DIRECT_URL: directUrlSet ? `SET(${directUrlLen})` : "NOT_SET",
      DATABASE_URL: dbUrlSet ? `SET(${dbUrlLen})` : "NOT_SET",
    });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    const message = err.message
      .replace(/:[^:@\s]+@/g, ":***@")
      .slice(0, 600);
    return NextResponse.json(
      {
        status: "error",
        errorType: err.constructor.name,
        message,
        DIRECT_URL: directUrlSet ? `SET(${directUrlLen})` : "NOT_SET",
        DATABASE_URL: dbUrlSet ? `SET(${dbUrlLen})` : "NOT_SET",
      },
      { status: 500 }
    );
  }
}
