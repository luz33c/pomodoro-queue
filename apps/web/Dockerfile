FROM node:24.21.0-bookworm-slim AS base

RUN apt-get update \
  && apt-get install -y --no-install-recommends wget git ca-certificates \
  && update-ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# =========================================================================== #

FROM base AS installer

ARG PNPM_VERSION=11.28.2
RUN npm install --global "pnpm@${PNPM_VERSION}"

# This layer only invalidates when dependencies change, not on source changes.
# --parents preserves directory structure, picking up all workspace packages automatically.
COPY --parents **/package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile --ignore-scripts

# =========================================================================== #

FROM installer AS builder

COPY . .

ARG SOURCE_COMMIT VITE_SERVER_URL VITE_WEB_URL VITE_CLERK_PUBLISHABLE_KEY CLERK_SECRET_KEY VITE_IMGPROXY_URL VITE_IMGPROXY_SIGNATURE DATABASE_URL
ENV SOURCE_COMMIT=${SOURCE_COMMIT} \
    VITE_SERVER_URL=${VITE_SERVER_URL} \
    VITE_WEB_URL=${VITE_WEB_URL} \
    VITE_CLERK_PUBLISHABLE_KEY=${VITE_CLERK_PUBLISHABLE_KEY} \
    CLERK_SECRET_KEY=${CLERK_SECRET_KEY} \
    VITE_IMGPROXY_URL=${VITE_IMGPROXY_URL} \
    VITE_IMGPROXY_SIGNATURE=${VITE_IMGPROXY_SIGNATURE} \
    DATABASE_URL=${DATABASE_URL}

# TODO: Uncomment this when you have `test:unit` or `test:e2e` scripts defined in your apps/*/package.json or packages/*/package.json files.
RUN pnpm run test:unit:run
# RUN pnpm run test:e2e:run

RUN pnpm --filter @tsu-stack/web run build
RUN pnpm --filter @tsu-stack/web deploy --prod --legacy /prod/web

# =========================================================================== #

FROM base AS production

RUN addgroup --gid 1001 nodejs \
    && adduser --uid 1001 --ingroup nodejs --disabled-password --gecos "" web

COPY --from=builder --chown=web:nodejs /prod/web /app

USER web

ENV NODE_ENV=production
ENV PORT=3000

HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT}$(echo ${VITE_WEB_URL} | sed 's|^http[s]*://[^/]*||' | sed 's|/$||')/_api/health/live || exit 1

CMD ["node", "/app/server.ts"]
