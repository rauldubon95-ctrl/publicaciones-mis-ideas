import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://rauldubon.org";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim();

  if (!token) {
    return NextResponse.redirect(`${BASE_URL}/suscribir/error`);
  }

  const sub = await prisma.subscription.findUnique({ where: { token } });

  if (!sub) {
    return NextResponse.redirect(`${BASE_URL}/suscribir/error`);
  }

  if (sub.status === "ACTIVE") {
    // Ya estaba confirmado — redirigir igual a la página de éxito
    return NextResponse.redirect(`${BASE_URL}/suscribir/confirmado`);
  }

  await prisma.subscription.update({
    where: { token },
    data: { status: "ACTIVE", confirmedAt: new Date() },
  });

  return NextResponse.redirect(`${BASE_URL}/suscribir/confirmado`);
}
