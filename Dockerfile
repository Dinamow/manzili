FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json yarn.lock* package-lock.json* ./
COPY prisma ./prisma
# Install ALL deps (incl. dev) so the `prisma` CLI is available, generate the
# client into node_modules/.prisma/client/, then prune dev deps for slim runtime.
RUN if [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    else npm install; fi \
 && npx prisma generate \
 && npm prune --omit=dev

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY index.js ./
COPY src ./src
COPY prisma ./prisma

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1

CMD ["node", "index.js"]
