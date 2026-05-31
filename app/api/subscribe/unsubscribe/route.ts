import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://rauldubon.org";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim();

  if (!token) {
    return NextResponse.redirect(`${BASE_URL}/suscribir/cancelado`);
  }

  const sub = await prisma.subscription.findUnique({ where: { token } });

  if (!sub || sub.status === "UNSUBSCRIBED") {
    return NextResponse.redirect(`${BASE_URL}/suscribir/cancelado`);
  }

  await prisma.subscription.update({
    where: { token },
    data: { status: "UNSUBSCRIBED", unsubscribedAt: new Date() },
  });

  return NextResponse.redirect(`${BASE_URL}/suscribir/cancelado`);
}
