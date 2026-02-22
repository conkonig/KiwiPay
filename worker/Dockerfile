FROM node:22-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter worker build
ENV NODE_ENV=production
WORKDIR /app/worker
CMD ["node", "dist/index.js"]
