import { PrismaClient } from "@/generated/prisma"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  return new PrismaClient()
}

// In local development we prefer a fresh client per module load so schema changes
// are picked up immediately instead of reusing a stale globally cached delegate map.
export const prisma =
  process.env.NODE_ENV === "production"
    ? (globalForPrisma.prisma ?? createPrismaClient())
    : createPrismaClient()

if (process.env.NODE_ENV === "production") {
  globalForPrisma.prisma = prisma
}

export const db = prisma
