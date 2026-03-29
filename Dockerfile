# Multi-stage build for Next.js app with Prisma
FROM node:20-alpine AS base

# Install system dependencies
RUN apk add --no-cache libc6-compat openssl

# ============================================
# Dependencies stage
# ============================================
FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci

# ============================================
# Builder stage
# ============================================
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY prisma ./prisma
COPY . .

# Build
RUN npx prisma generate
RUN npm run build

# Verify build output
RUN ls -la .next/standalone/ 2>&1 || echo "Standalone build check"
RUN ls -la .next/static/ 2>&1 || echo "Static files check"

# ============================================
# Production runner stage
# ============================================
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
RUN apk add --no-cache openssl

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone build - using different approach
# Copy entire .next directory first
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next

# Copy the standalone server.js to root
RUN cp .next/standalone/server.js ./server.js 2>/dev/null || echo "server.js copy check"

# Copy node_modules
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy prisma files
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

# Generate Prisma Client in runner
RUN npx prisma generate

RUN chmod +x ./scripts/start.sh
USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["./scripts/start.sh"]
