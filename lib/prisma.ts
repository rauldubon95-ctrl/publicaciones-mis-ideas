import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// Priority order for connection URL:
// 1. POSTGRES_PRISMA_URL — injected automatically by Supabase-Vercel integration (optimal)
// 2. Session mode pooler derived from DATABASE_URL (port 5432 on pooler host, IPv4)
// Direct DB (db.*.supabase.co:5432) is IPv6-only and not reachable from Vercel Lambda.
function buildConnectionUrl(): string | undefined {
  if (process.env.POSTGRES_PRISMA_URL) return process.env.POSTGRES_PRISMA_URL;
  const base = process.env.DATABASE_URL;
  if (!base) return undefined;
  // Transform transaction mode (port 6543) → session mode (port 5432) on pooler host
  return base
    .replace(":6543/", ":5432/")
    .replace("pgbouncer=true&", "")
    .replace("&pgbouncer=true", "")
    .replace("?pgbouncer=true&", "?")
    .replace("?pgbouncer=true", "");
}

const connectionUrl = buildConnectionUrl();

let client: PrismaClient;
client =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error"] : [],
    ...(connectionUrl && { datasources: { db: { url: connectionUrl } } }),
  });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = client;

export const prisma = client!;
