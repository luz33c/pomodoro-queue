FROM node:24.18.0-bookworm-slim AS base

RUN apt-get update \
  && apt-get install -y --no-install-recommends wget git ca-certificates \
  && update-ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# =========================================================================== #

FROM base AS installer

ARG PNPM_VERSION=11.22.0
RUN npm install --global "pnpm@${PNPM_VERSION}"

# This layer only invalidates when dependencies change, not on source changes.
# --parents preserves directory structure, picking up all workspace packages automatically.
COPY --parents **/package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile --ignore-scripts

# =========================================================================== #

FROM installer AS migrator

COPY . .

CMD ["pnpm", "run", "db:migrate"]

# =========================================================================== #

FROM installer AS builder

COPY . .

# Ensure the migrations directory exists so that the build doesn't fail when trying to copy it in the production stage.
RUN mkdir -p packages/db/migrations

ARG SOURCE_COMMIT VITE_SERVER_URL VITE_WEB_URL VITE_CLERK_PUBLISHABLE_KEY CLERK_SECRET_KEY CLERK_AUTHORIZED_PARTIES DATABASE_URL BETTER_AUTH_SECRET
ENV SOURCE_COMMIT=${SOURCE_COMMIT} \
    VITE_SERVER_URL=${VITE_SERVER_URL} \
    VITE_WEB_URL=${VITE_WEB_URL} \
    VITE_CLERK_PUBLISHABLE_KEY=${VITE_CLERK_PUBLISHABLE_KEY} \
    CLERK_SECRET_KEY=${CLERK_SECRET_KEY} \
    CLERK_AUTHORIZED_PARTIES=${CLERK_AUTHORIZED_PARTIES}

# TODO: Uncomment this when you have `test:unit` or `test:e2e` scripts defined in your apps/*/package.json or packages/*/package.json files.
RUN pnpm run test:unit:run
# RUN pnpm run test:e2e:run

RUN pnpm --filter @tsu-stack/server run build

# =========================================================================== #

FROM base AS production

RUN addgroup --gid 1001 nodejs \
    && adduser --uid 1001 --ingroup nodejs --disabled-password --gecos "" server

COPY --from=builder --chown=server:nodejs /app/apps/server/.output /app/.output
COPY --from=builder --chown=server:nodejs /app/packages/db/migrations /app/.output/migrations

USER server

ENV NODE_ENV=production
ENV PORT=5000

# You may want to consider editing the healthcheck if you want to use /health/live (just the server) or /health/ready (all services)
HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT}$(echo ${VITE_SERVER_URL} | sed 's|^http[s]*://[^/]*||' | sed 's|/$||')/health/live || exit 1

# You may set --max-old-space-size to control the maximum V8 heap size.
# This creates a hard cap on the Node.js JavaScript heap and causes the
# process to exit with an OOM error if exceeded.
# It helps prevent the process from consuming excessive memory,
# but container-level memory limits are the recommended primary safeguard.
CMD ["node", "/app/.output/index.mjs", "--hostname", "0.0.0.0"]
