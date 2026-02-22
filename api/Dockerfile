FROM node:22-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter api build
ENV NODE_ENV=production
WORKDIR /app/api
CMD ["node", "dist/index.js"]
