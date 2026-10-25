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

# Client values are compiled into the bundle, so they must be the production values at build time.
ARG VITE_APP_URL VITE_SERVER_URL VITE_WEB_URL VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_APP_URL=${VITE_APP_URL} \
    VITE_SERVER_URL=${VITE_SERVER_URL} \
    VITE_WEB_URL=${VITE_WEB_URL} \
    VITE_CLERK_PUBLISHABLE_KEY=${VITE_CLERK_PUBLISHABLE_KEY}

RUN pnpm --filter @tsu-stack/app run build
# Production dependencies are only what server.ts needs; the bundle is already in dist/web.
RUN pnpm --filter @tsu-stack/app deploy --prod --legacy /prod/app

# =========================================================================== #

FROM base AS production

RUN addgroup --gid 1001 nodejs \
    && adduser --uid 1001 --ingroup nodejs --disabled-password --gecos "" app

COPY --from=builder --chown=app:nodejs /prod/app /app

USER app

ARG SOURCE_COMMIT
ENV NODE_ENV=production
ENV PORT=3002
ENV SOURCE_COMMIT=${SOURCE_COMMIT}

HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT}$(echo ${VITE_APP_URL} | sed 's|^http[s]*://[^/]*||' | sed 's|/$||')/_health || exit 1

CMD ["node", "/app/server.ts"]
