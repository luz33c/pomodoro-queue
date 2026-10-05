# Environment Variables

## Single Source of Truth

All env vars live in `packages/env/.env` (copy from `.env.example`). Validated by Zod at import time via `@t3-oss/env-core`.

## Scoped Objects

| Object               | Scope                                                                         |
| -------------------- | ----------------------------------------------------------------------------- |
| `ENV_DATABASE`       | Database CLI (`packages/db/drizzle.config.ts`); validates only `DATABASE_URL` |
| `ENV_SERVER`         | Server-only (`apps/server`)                                                   |
| `ENV_WEB_ISOMORPHIC` | Client + server (`apps/web`)                                                  |
| `ENV_WEB_SERVER`     | Web server-only                                                               |

Database CLI commands import `@tsu-stack/env/database/env` directly. This entry point must stay independent of `ENV_SERVER`, so database tools do not require Clerk credentials or application URL configuration. Both Compose `migrate` services receive only `DATABASE_URL`.

The application DB singleton and Server still use `ENV_SERVER`; this separation applies to database tooling, not application startup. All scopes continue to use the same `packages/env/.env` file.

## Client Exposure Rule

Only vars prefixed with `VITE_` are available on the client (`import.meta.env`). Server-only vars (`DATABASE_URL`, `CLERK_SECRET_KEY`) must never be exposed to the client.

## When Adding/Updating Env Vars

Update in **six places**:

1. `packages/env/src/` — add Zod validation to the appropriate scoped object
2. `docker-compose.yaml` — add to both `build.args` and `environment` for affected services
3. `Dockerfile` — add matching `ARG` + `ENV` declarations in the relevant Dockerfile(s)
4. `.env.example` — add with placeholder value for local development
5. `.github/README.md` — update this file with the new var, its scope, and usage notes
6. (optional) `apps/web/vite.config.ts` — if the var is used in the web app or if the environment is used in the server & is mounted on the web app, add to `define` for build-time injection

Missing any of these causes build or runtime failures with no obvious error message.

Env docs and templates must mirror the validated schema in `packages/env/src/`. Do not invent, retain, or document env vars that are not actually read there. If a setting is code-owned, document it as code-owned instead of adding a new env knob.

## Gotchas

- `z.stringbool()` is used for boolean env vars (parses "true"/"false" strings)
- Dev defaults exist for most `VITE_*` vars; `ENV_SERVER` requires database and Clerk configuration, while `ENV_DATABASE` requires only `DATABASE_URL`
- The existing Server and Web env modules log loading with `console.debug` — check terminal output for validation errors
