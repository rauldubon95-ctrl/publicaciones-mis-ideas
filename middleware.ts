import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { esBot, esScanPath } from "@/lib/security";

function getIp(req: NextRequest): string {
  // En Vercel, x-vercel-forwarded-for no puede ser falsificado por el cliente
  return (
    req.headers.get("x-vercel-forwarded-for") ??
    req.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function generarTraceId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5");
}

function logEvento(
  tipo: string,
  ip: string,
  ruta: string,
  traceId: string,
  detalles?: Record<string, string>
): void {
  const token = process.env.INTERNAL_EVENT_TOKEN;
  if (!token) return;
  fetch("/api/seguridad/evento", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-token": token,
    },
    body: JSON.stringify({ tipo, ip, ruta, detalles: { ...detalles, traceId } }),
  }).catch(() => {});
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const ip = getIp(request);
  const ua = request.headers.get("user-agent");
  const traceId = request.headers.get("x-trace-id") ?? generarTraceId();

  if (esScanPath(pathname)) {
    logEvento("SCAN_PATH", ip, pathname, traceId, { ua: ua?.slice(0, 120) ?? "n/a" });
    return new NextResponse("Not Found", { status: 404 });
  }

  if (pathname.startsWith("/api/") && esBot(ua)) {
    logEvento("BOT_DETECTADO", ip, pathname, traceId, { ua: ua?.slice(0, 120) ?? "n/a" });
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (!pathname.startsWith("/admin")) {
    const response = NextResponse.next();
    response.headers.set("x-trace-id", traceId);
    return response;
  }

  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  const cookie = request.cookies.get("admin_auth")?.value;
  const secret = process.env.ADMIN_SECRET;

  if (!secret) {
    return new NextResponse("ADMIN_SECRET no configurado", { status: 500 });
  }

  if (cookie && (await verifySessionToken(cookie, secret))) {
    const response = NextResponse.next();
    response.headers.set("x-trace-id", traceId);
    return response;
  }

  logEvento("ACCESO_DENEGADO", ip, pathname, traceId);
  return NextResponse.redirect(new URL("/admin/login", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt).*)"],
};
