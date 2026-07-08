# syntax=docker/dockerfile:1

FROM node:24-bookworm-slim AS build
RUN corepack enable && corepack prepare pnpm@11.1.1 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# --ignore-scripts évite le postinstall "nuxt prepare" (config pas encore copiée) ;
# pnpm rebuild déclenche le prebuild-install de better-sqlite3 (autorisé via allowBuilds).
RUN pnpm install --frozen-lockfile --ignore-scripts && pnpm rebuild better-sqlite3
COPY . .
RUN pnpm build

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production \
    NUXT_DATABASE_PATH=/data/opentvtime.sqlite \
    NUXT_MIGRATIONS_DIR=/app/server/db/migrations \
    PORT=3000 \
    HOST=0.0.0.0
WORKDIR /app
# gosu : droppe les privilèges vers PUID:PGID dans l'entrypoint (démarrage en root).
# tzdata : honore TZ (Europe/Paris) pour les dates de la vue « À venir ».
RUN apt-get update \
  && apt-get install -y --no-install-recommends gosu tzdata \
  && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/.output ./.output
COPY --from=build /app/server/db/migrations ./server/db/migrations
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
EXPOSE 3000
VOLUME /data
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", ".output/server/index.mjs"]
