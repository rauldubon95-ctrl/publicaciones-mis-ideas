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
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

// ──────────────────────────────────────────
// Registro de evento de seguridad
// ──────────────────────────────────────────
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
        ip,
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
  bloqueoMs?: number; // si se excede el límite, bloquear este tiempo extra
}

interface RateLimitResult {
  permitido: boolean;
  bloqueado: boolean;
  contador: number;
  resetAt: Date;
}

export async function checkRateLimitDb(
  ip: string,
  ruta: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const clave = `${ip}:${ruta}`;
  const ahora = new Date();

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
    // Si falla la DB, permitir (fail-open para no bloquear a usuarios legítimos)
    return {
      permitido: true,
      bloqueado: false,
      contador: 0,
      resetAt: new Date(ahora.getTime() + config.ventanaMs),
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
// ──────────────────────────────────────────
const BOT_PATTERNS = [
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
  /python-requests\/[0-9]/i,
  /go-http-client/i,
  /curl\/[0-9]/i,
];

const SCAN_PATHS = [
  "/wp-admin",
  "/wp-login",
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
];

export function esBot(userAgent: string | null): boolean {
  if (!userAgent) return true;
  return BOT_PATTERNS.some((p) => p.test(userAgent));
}

export function esScanPath(pathname: string): boolean {
  return SCAN_PATHS.some((p) => pathname.toLowerCase().includes(p));
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
