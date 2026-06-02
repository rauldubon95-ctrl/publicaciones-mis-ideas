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

  // Defensa en profundidad para /api/admin/*: si no hay cookie admin_auth,
  // rechazar 401 antes de llegar al handler. La validación real de la cookie
  // (JTI vs SesionAdmin) sigue en cada endpoint vía isAdminAuthorized() —
  // esto solo evita que un endpoint admin nuevo que olvide el guard quede
  // accesible sin estar logueado. Ver §18 P3 en CLAUDE.md.
  if (pathname.startsWith("/api/admin/") && !request.cookies.get("admin_auth")?.value) {
    logEvento("ACCESO_DENEGADO", ip, pathname, traceId, { motivo: "sin-cookie-admin" });
    return new NextResponse(
      JSON.stringify({ error: "No autorizado" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
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
  // Edge runtime no puede importar desde lib/secrets.ts si éste tuviera
  // dependencias node:. Mantenemos la lectura inline aquí.
  const secret =
    process.env.SESSION_SIGNING_SECRET ?? process.env.ADMIN_SECRET;

  if (!secret) {
    return new NextResponse("Secreto de sesión no configurado", { status: 500 });
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
