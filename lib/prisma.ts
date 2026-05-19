import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// Use the direct connection (port 5432) for serverless reliability.
// The pooler URL (port 6543) is not reachable from Vercel Lambda environments.
// connection_limit=1 is required for serverless to avoid exhausting DB connections.
function buildDatasourceUrl() {
  const base = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!base) return undefined;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}connection_limit=1&pool_timeout=30`;
}

const datasourceUrl = buildDatasourceUrl();

let client: PrismaClient;
client =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error"] : [],
    ...(datasourceUrl && { datasources: { db: { url: datasourceUrl } } }),
  });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = client;

export const prisma = client!;
