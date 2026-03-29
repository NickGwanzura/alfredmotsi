import { PrismaClient } from '@prisma/client';

// Log Prisma Client status on module load
console.log('[PRISMA] Checking Prisma Client...');

try {
  // Test import - will fail if client not generated
  const testClient = new PrismaClient();
  console.log('[PRISMA] ✓ Prisma Client available');
  testClient.$disconnect();
} catch (error) {
  console.error('[PRISMA] ✗ Prisma Client initialization failed:', error);
  console.error('[PRISMA] Run: npx prisma generate');
}

// Lazy-loaded Prisma client with global fallback for hot reload
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Connect and log status
prisma.$connect()
  .then(() => console.log('[PRISMA] ✓ Database connected'))
  .catch((err) => {
    console.error('[PRISMA] ✗ Database connection failed:', err.message);
    console.error('[PRISMA]   Check DATABASE_URL environment variable');
  });

export default prisma;
