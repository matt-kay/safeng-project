FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable pnpm

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
ENV CI=true
RUN pnpm run build
RUN pnpm prune --prod

FROM node:22-alpine AS production

ENV NODE_ENV=production
ENV PORT=8080

USER node
WORKDIR /app

COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist

EXPOSE 8080

CMD ["node", "dist/main.js"]
