import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

let client: PrismaClient;
try {
  client =
    globalForPrisma.prisma ||
    new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["error"] : [] });
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = client;
} catch (e) {
  console.error("[PRISMA_INIT_ERROR]", String(e));
  console.error("[ENV_CHECK] DATABASE_URL set:", !!process.env.DATABASE_URL);
  console.error("[ENV_CHECK] DIRECT_URL set:", !!process.env.DIRECT_URL);
  throw e;
}

export const prisma = client!;
