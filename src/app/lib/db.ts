import { PrismaClient } from '@prisma/client';

// Lazy-loaded Prisma client with global fallback for hot reload
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Log connection status (non-blocking)
prisma.$connect()
  .then(() => console.log('[PRISMA] Database connected'))
  .catch((err) => console.error('[PRISMA] Database connection failed:', err));

export default prisma;
