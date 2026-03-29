# Multi-stage build for Next.js app with Prisma
FROM node:20-alpine AS base

# Install system dependencies
RUN apk add --no-cache libc6-compat openssl

# ============================================
# Dependencies stage
# ============================================
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Copy Prisma schema BEFORE npm install (postinstall needs it)
COPY prisma ./prisma

# Install dependencies (postinstall will run prisma generate)
RUN npm ci

# ============================================
# Builder stage
# ============================================
FROM base AS builder
WORKDIR /app

# Copy node_modules WITH generated Prisma client from deps
COPY --from=deps /app/node_modules ./node_modules

# Copy prisma schema (in case of any changes)
COPY prisma ./prisma

# Copy rest of the app
COPY . .

# Ensure Prisma Client is generated (redundant but safe)
RUN npx prisma generate

# Build the Next.js app
RUN npm run build

# ============================================
# Production runner stage
# ============================================
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install openssl for Prisma
RUN apk add --no-cache openssl

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Create required directories
RUN mkdir -p .next
RUN chown nextjs:nodejs .next

# Copy standalone build output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Copy static files
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma schema for runtime
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Copy package.json for scripts
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Copy node_modules WITH Prisma generated client
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy startup scripts
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

# Make startup script executable
RUN chmod +x ./scripts/start.sh

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Environment defaults
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the application
CMD ["./scripts/start.sh"]
