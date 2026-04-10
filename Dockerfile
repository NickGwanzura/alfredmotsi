# Build stage
FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Copy all files
COPY . .

# Install dependencies
RUN npm ci

# Build the app
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl

WORKDIR /app

# Create user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the ENTIRE standalone output (this contains everything needed)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Copy static files to correct location
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma CLI bits so migrations can run without npx downloading a new version
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.bin ./node_modules/.bin
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# Copy tsx and dependencies for seed script
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/tsx ./node_modules/tsx
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@esbuild ./node_modules/@esbuild
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/esbuild ./node_modules/esbuild
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@types ./node_modules/@types

# Copy prisma for migrations
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Copy scripts
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
RUN chmod +x ./scripts/start.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV=production

CMD ["./scripts/start.sh"]
