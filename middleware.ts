import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";

const BOT_UA = [
  /sqlmap/i, /nikto/i, /nmap/i, /masscan/i, /zgrab/i, /nuclei/i,
  /hydra/i, /metasploit/i, /dirbuster/i, /gobuster/i, /wfuzz/i,
  /acunetix/i, /nessus/i, /openvas/i,
];

const SCAN_PATHS = [
  "/wp-admin", "/wp-login", "/wp-content", "/.env", "/phpinfo",
  "/admin.php", "/.git", "/shell", "/xmlrpc", "/.htaccess",
  "/config.php", "/web.config", "/etc/passwd", "/.well-known/evil",
  "/actuator", "/console", "/.aws", "/.ssh",
];

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function esBot(ua: string | null): boolean {
  if (!ua) return true;
  return BOT_UA.some((p) => p.test(ua));
}

function esScanPath(pathname: string): boolean {
  const lower = pathname.toLowerCase();
  return SCAN_PATHS.some((p) => lower.includes(p));
}

function logEvento(
  tipo: string,
  ip: string,
  ruta: string,
  detalles?: Record<string, string>
): void {
  fetch("/api/seguridad/evento", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tipo, ip, ruta, detalles }),
  }).catch(() => {});
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const ip = getIp(request);
  const ua = request.headers.get("user-agent");

  if (esScanPath(pathname)) {
    logEvento("SCAN_PATH", ip, pathname, { ua: ua?.slice(0, 120) ?? "n/a" });
    return new NextResponse("Not Found", { status: 404 });
  }

  if (pathname.startsWith("/api/") && esBot(ua)) {
    logEvento("BOT_DETECTADO", ip, pathname, { ua: ua?.slice(0, 120) ?? "n/a" });
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
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
    return NextResponse.next();
  }

  logEvento("ACCESO_DENEGADO", ip, pathname);
  return NextResponse.redirect(new URL("/admin/login", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt).*)"],
};
