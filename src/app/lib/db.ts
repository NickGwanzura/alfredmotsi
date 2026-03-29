import { PrismaClient } from '@prisma/client';
import { checkRequiredEnv } from './env';

// Safe environment check on first import (server-side only)
// Never throws - only logs warnings
if (typeof window === 'undefined') {
  checkRequiredEnv();
}

// Lazy-loaded Prisma client with global fallback for hot reload
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
