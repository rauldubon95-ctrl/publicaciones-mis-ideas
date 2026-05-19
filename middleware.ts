import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";

export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname === "/admin/login") {
    return NextResponse.next();
  }

  const cookie = request.cookies.get("admin_auth")?.value;
  const secret = process.env.ADMIN_SECRET;

  if (!secret) {
    return new NextResponse("ADMIN_SECRET no configurado", { status: 500 });
  }

  if (cookie && verifySessionToken(cookie, secret)) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/admin/login", request.url));
}

export const config = {
  matcher: ["/admin/:path*"],
};
