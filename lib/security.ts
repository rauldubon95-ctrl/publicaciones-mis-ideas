import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

// ──────────────────────────────────────────
// Tipos de evento
// ──────────────────────────────────────────
export type TipoEvento =
  | "LOGIN_FALLIDO"
  | "LOGIN_EXITOSO"
  | "RATE_LIMIT"
  | "BOT_DETECTADO"
  | "ACCESO_DENEGADO"
  | "SPAM"
  | "SCAN_PATH"
  | "INPUT_INVALIDO";

// ──────────────────────────────────────────
// Extracción de IP real
// ──────────────────────────────────────────
export function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-vercel-forwarded-for") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

// ──────────────────────────────────────────
// Registro de evento de seguridad
// ──────────────────────────────────────────
async function hashIpForLog(ip: string): Promise<string> {
  if (ip === "unknown") return "unknown";
  const data = new TextEncoder().encode(ip);
  const buf = await globalThis.crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

export async function registrarEvento(
  tipo: TipoEvento,
  ip: string,
  ruta?: string,
  detalles?: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.eventoSeguridad.create({
      data: {
        tipo,
        ip: await hashIpForLog(ip),
        ruta: ruta ?? null,
        detalles: detalles ? JSON.stringify(detalles) : null,
      },
    });
  } catch {
    // El logging nunca debe romper el flujo principal
  }
}

// ──────────────────────────────────────────
// Rate limiting persistente en DB
// Devuelve { permitido, bloqueado, contador }
// ──────────────────────────────────────────
interface RateLimitConfig {
  maxIntentos: number;
  ventanaMs: number;
  bloqueoMs?: number;
  // fail-close: si la DB cae, rechazar el request (seguro para login/AI)
  // fail-open:  si la DB cae, permitir el request (UX para comentarios/reacciones)
  failBehavior?: "close" | "open";
}

interface RateLimitResult {
  permitido: boolean;
  bloqueado: boolean;
  contador: number;
  resetAt: Date;
  dbError?: boolean;
}

export async function checkRateLimitDb(
  ip: string,
  ruta: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const clave = `${ip}:${ruta}`;
  const ahora = new Date();
  const failBehavior = config.failBehavior ?? "open";

  try {
    const registro = await prisma.rateLimitDb.findUnique({ where: { clave } });

    // Si está bloqueado proactivamente
    if (registro?.bloqueadoHasta && registro.bloqueadoHasta > ahora) {
      return {
        permitido: false,
        bloqueado: true,
        contador: registro.contador,
        resetAt: registro.bloqueadoHasta,
      };
    }

    // Si expiró la ventana, reiniciar
    if (!registro || registro.resetAt < ahora) {
      const resetAt = new Date(ahora.getTime() + config.ventanaMs);
      await prisma.rateLimitDb.upsert({
        where: { clave },
        create: { clave, contador: 1, resetAt, bloqueadoHasta: null },
        update: { contador: 1, resetAt, bloqueadoHasta: null },
      });
      return { permitido: true, bloqueado: false, contador: 1, resetAt };
    }

    // Incrementar contador
    const nuevoContador = registro.contador + 1;
    const excedido = nuevoContador > config.maxIntentos;

    const bloqueadoHasta =
      excedido && config.bloqueoMs
        ? new Date(ahora.getTime() + config.bloqueoMs)
        : null;

    await prisma.rateLimitDb.update({
      where: { clave },
      data: {
        contador: nuevoContador,
        bloqueadoHasta: excedido && bloqueadoHasta ? bloqueadoHasta : undefined,
      },
    });

    return {
      permitido: !excedido,
      bloqueado: excedido,
      contador: nuevoContador,
      resetAt: bloqueadoHasta ?? registro.resetAt,
    };
  } catch {
    // fail-close: rechazar si DB no disponible (rutas críticas: login, AI)
    // fail-open: permitir si DB no disponible (rutas no críticas: comentarios)
    const permitido = failBehavior === "open";
    return {
      permitido,
      bloqueado: !permitido,
      contador: 0,
      resetAt: new Date(ahora.getTime() + config.ventanaMs),
      dbError: true,
    };
  }
}

// ──────────────────────────────────────────
// Sanitización de texto de usuario
// ──────────────────────────────────────────
export function sanitizarTexto(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
    .trim();
}

// ──────────────────────────────────────────
// Detección de bots / scanners por User-Agent
// Fuente única de verdad — importada también por proxy.ts
// ──────────────────────────────────────────
export const BOT_UA_PATTERNS = [
  /sqlmap/i,
  /nikto/i,
  /nmap/i,
  /masscan/i,
  /zgrab/i,
  /nuclei/i,
  /hydra/i,
  /metasploit/i,
  /burpsuite/i,
  /dirbuster/i,
  /gobuster/i,
  /wfuzz/i,
  /acunetix/i,
  /nessus/i,
  /openvas/i,
  /go-http-client/i,
  /libwww-perl/i,
  /scrapy/i,
  /httpclient/i,
  /java\/[0-9]/i,
  /zgrab/i,
  /zmeu/i,
  /harvest/i,
  /grab/i,
  // Navegadores headless y automatización
  /HeadlessChrome/i,
  /PhantomJS/i,
  /Selenium/i,
  /WebDriver/i,
  /puppeteer/i,
  /playwright/i,
];

export const SCAN_PATHS = [
  "/wp-admin",
  "/wp-login",
  "/wp-content",
  "/.env",
  "/phpinfo",
  "/admin.php",
  "/.git",
  "/shell",
  "/cmd",
  "/eval",
  "/xmlrpc",
  "/.htaccess",
  "/config.php",
  "/web.config",
  "/etc/passwd",
  "/actuator",
  "/console",
  "/.aws",
  "/.ssh",
  "/.well-known/evil",
  "/phpmyadmin",
  // Paths adicionales de reconocimiento
  "/.git/config",
  "/.git/head",
  "/env.js",
  "/config/database",
  "/server-status",
  "/.svn",
  "/debug",
  "/telescope",
  "/horizon",
  "/api/env",
  "/api/.env",
  "/server-info",
  "/elmah.axd",
  "/trace.axd",
];

export function esBot(userAgent: string | null): boolean {
  if (!userAgent) return true;
  return BOT_UA_PATTERNS.some((p) => p.test(userAgent));
}

export function esScanPath(pathname: string): boolean {
  const lower = pathname.toLowerCase();
  // Usar coincidencia exacta o prefijo con separador para evitar
  // falsos positivos en rutas legítimas que contienen la cadena
  // (ej: /publicaciones/evaluacion contiene /eval pero NO es un scan path)
  return SCAN_PATHS.some(
    (p) => lower === p || lower.startsWith(p + "/") || lower.startsWith(p + "?")
  );
}

// ──────────────────────────────────────────
// Limpieza periódica de registros expirados
// (llamar ocasionalmente desde setup-storage o similar)
// ──────────────────────────────────────────
export async function limpiarRateLimitsExpirados(): Promise<void> {
  try {
    const hace1hora = new Date(Date.now() - 60 * 60 * 1000);
    await prisma.rateLimitDb.deleteMany({ where: { resetAt: { lt: hace1hora } } });
    const hace30dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await prisma.eventoSeguridad.deleteMany({ where: { creadoAt: { lt: hace30dias } } });
  } catch {
    // silencioso
  }
}
