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

// Genera un nonce criptográfico de 16 bytes codificado en base64.
// crypto.getRandomValues + btoa están disponibles en el runtime Node de proxy.
function generarNonce(): string {
  const arr = crypto.getRandomValues(new Uint8Array(16));
  return btoa(Array.from(arr, (b) => String.fromCharCode(b)).join(""));
}

// Construye el header Content-Security-Policy para la petición dada.
// Reemplaza 'unsafe-inline' en script-src por un nonce por petición +
// 'strict-dynamic' (los scripts cargados por un script con nonce son
// confiables automáticamente, lo que permite que Next.js y PayPal funcionen).
function construirCSP(nonce: string): string {
  const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
    : "*.supabase.co";

  // H3: URL del Worker leída de env var (WORKER_URL) para no exponer
  // el nombre de usuario de Cloudflare en el repositorio público.
  const workerUrl =
    process.env.WORKER_URL ?? "https://sociologia.raul-dubon95.workers.dev";

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://www.paypal.com`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    `img-src 'self' data: blob: https://${supabaseHost} https://www.paypal.com`,
    `connect-src 'self' https://${supabaseHost} ${workerUrl} https://www.paypal.com https://api.paypal.com`,
    "frame-src 'self' https://view.officeapps.live.com https://www.paypal.com https://www.sandbox.paypal.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

// Crea un NextResponse.next() con el nonce inyectado en las request headers
// (para que los Server Components puedan leerlo vía headers()) y con el CSP
// dinámico en la response.
function crearRespuestaConNonce(
  request: NextRequest,
  traceId: string,
  nonce: string
): NextResponse {
  const csp = construirCSP(nonce);

  // IMPORTANTE: Next.js extrae el nonce del header Content-Security-Policy
  // presente en las REQUEST headers (no de x-nonce) para propagarlo a sus
  // propios scripts de framework y a los componentes next/script (PayPal).
  // Por eso el CSP debe ir tanto en request como en response. x-nonce queda
  // como conveniencia para que JsonLd.tsx lo lea vía headers().
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("x-trace-id", traceId);
  response.headers.set("Content-Security-Policy", csp);
  return response;
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

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const ip = getIp(request);
  const ua = request.headers.get("user-agent");
  const traceId = request.headers.get("x-trace-id") ?? generarTraceId();
  const nonce = generarNonce();

  if (esScanPath(pathname)) {
    logEvento("SCAN_PATH", ip, pathname, traceId, { ua: ua?.slice(0, 120) ?? "n/a" });
    return new NextResponse("Not Found", { status: 404 });
  }

  if (pathname.startsWith("/api/") && esBot(ua)) {
    logEvento("BOT_DETECTADO", ip, pathname, traceId, { ua: ua?.slice(0, 120) ?? "n/a" });
    return new NextResponse("Forbidden", { status: 403 });
  }

  // H1: defensa en profundidad para /api/admin/* — verifica la cookie
  // admin_auth criptográficamente (no solo su presencia). Esto evita que
  // un atacante con Cookie: admin_auth=basura acceda a endpoints que
  // olvidaran llamar a isAdminAuthorized(). La validación detallada
  // (JTI vs SesionAdmin) sigue en cada handler vía isAdminAuthorized().
  if (
    pathname.startsWith("/api/admin/") &&
    pathname !== "/api/admin/login"
  ) {
    const adminCookie = request.cookies.get("admin_auth")?.value;
    const adminSecret = process.env.SESSION_SIGNING_SECRET;
    if (!adminCookie || !adminSecret || !(await verifySessionToken(adminCookie, adminSecret))) {
      logEvento("ACCESO_DENEGADO", ip, pathname, traceId, { motivo: "cookie-invalida" });
      return new NextResponse(
        JSON.stringify({ error: "No autorizado" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  if (!pathname.startsWith("/admin")) {
    return crearRespuestaConNonce(request, traceId, nonce);
  }

  if (pathname === "/admin/login") {
    return crearRespuestaConNonce(request, traceId, nonce);
  }

  const cookie = request.cookies.get("admin_auth")?.value;
  // H2: solo SESSION_SIGNING_SECRET, sin fallback a ADMIN_SECRET.
  const secret = process.env.SESSION_SIGNING_SECRET;

  if (!secret) {
    return new NextResponse("Secreto de sesión no configurado", { status: 500 });
  }

  if (cookie && (await verifySessionToken(cookie, secret))) {
    return crearRespuestaConNonce(request, traceId, nonce);
  }

  logEvento("ACCESO_DENEGADO", ip, pathname, traceId);
  return NextResponse.redirect(new URL("/admin/login", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt).*)"],
};
