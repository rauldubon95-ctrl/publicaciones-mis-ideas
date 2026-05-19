import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// Supabase direct DB (db.*.supabase.co:5432) is IPv6-only → unreachable from Vercel Lambda (IPv4).
// Supabase pooler transaction mode (pooler.supabase.com:6543) is not active on this project.
// Use Supabase pooler SESSION mode (pooler.supabase.com:5432) which uses IPv4 and is always active.
function buildSessionUrl(): string | undefined {
  const base = process.env.DATABASE_URL;
  if (!base) return undefined;
  return base
    .replace(":6543/", ":5432/")
    .replace("pgbouncer=true&", "")
    .replace("&pgbouncer=true", "")
    .replace("?pgbouncer=true&", "?")
    .replace("?pgbouncer=true", "");
}

const sessionUrl = buildSessionUrl();

let client: PrismaClient;
client =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error"] : [],
    ...(sessionUrl && { datasources: { db: { url: sessionUrl } } }),
  });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = client;

export const prisma = client!;
