# Workflow

## Essential Commands

| Command          | Purpose                                         |
| ---------------- | ----------------------------------------------- |
| `pnpm run dev`   | Start all dev servers                           |
| `pnpm run check` | Run formatting, lint, and type-check validation |
| `pnpm run fix`   | Apply formatting/lint fixes, then type-check    |
| `pnpm run build` | Build all packages                              |

## Validation Timing

Default to user-directed validation. Do not run `pnpm run check`, `pnpm run fix`, root `check`/`fix` scripts, project-wide TypeScript checks, workspace builds, or equivalent broad validation unless the user explicitly asks for checks or approves them after being asked.

- For one-off changes, finish the requested edit, summarize what changed, and directly prompt the user before ending the turn. Use the native UI or structured input priority in [Choice flows](./choice-flows.md); do not merely say that checks were not run. Run the selected command only after the user chooses it.
- For larger planned work, such as implementing a `plan.md`, do not check every intermediate step unless explicitly told to. Run checks only at the end of the whole plan, or at substantial milestones/phases, and only when the user asked for that validation cadence.
- When the user does ask for validation, prefer the narrowest command that covers the touched surface. Use package-local `pnpm run check` in an app or package that declares that script.
- Use `pnpm run fix`, root `fix`, workspace TypeScript checks, or workspace builds only when the user explicitly chooses fixing/broad validation or asks for final plan validation.
- Do not reach for root checks when a package-local `pnpm run check` covers the approved validation surface.

`pnpm run check` invokes the repository's read-only Oxfmt, Oxlint, and type-check validation. `pnpm run fix` applies formatting and lint fixes before type-checking. Treat fix commands as explicit user-requested actions, not default handoff steps.

For markdown-only edits, small documentation tweaks, or other changes that cannot affect formatting, linting, typechecking, build output, or runtime behavior, still prompt the user through [Choice flows](./choice-flows.md) instead of silently skipping validation. Make "skip validation" the recommended choice, and do not run `pnpm run check` or `pnpm run fix` unless the user chooses a check/fix option. The tracked hooks run read-only checks (staged-file format and lint on commit, the full `pnpm run check` on push); if the user asks for a commit or push, explain that validation will run as part of it.

## Completion Claims

- Do not report implementation, migration, validation, or cleanup work as complete until the relevant edits or commands have run and you have checked the resulting files or command output.
- If a workflow depends on generated artifacts or CLI state, verify that state directly instead of inferring completion from intent alone.

## Auxiliary Static Analysis

Fallow is an auxiliary cleanup signal, not part of the default validation path.

- Use `pnpm run fallow` only when the user explicitly asks for auxiliary cleanup signals after big features or broad refactors have landed.
- Do not add Fallow to commit hooks, `fix`, or normal handoff validation unless the user explicitly asks.
- Treat Fallow findings as review prompts. Verify framework entry points, dynamic usage, generated files, and package boundaries before deleting or suppressing code.

## Feature Workflows

For end-to-end feature implementation order across `packages/db`, `packages/core`, `packages/api`, and `apps/web`, use [End-to-end feature workflow](./end-to-end-features.md). Keep this file focused on validation timing, commands, and migration safety.

## Database Schema Changes

1. Edit schemas in `packages/db/src/schema/`
2. Run `pnpm run db:generate` to create migration files
3. **Check `DATABASE_URL`** — must point to localhost/127.0.0.1. If it looks like a production URL, **stop and warn the user**.
4. Run `pnpm run db:migrate` to apply. Features will silently fail without applied migrations.

## Other Commands

| Command                 | Purpose                         |
| ----------------------- | ------------------------------- |
| `pnpm run db:dev:start` | Start local PostgreSQL (Docker) |
| `pnpm run db:dev:stop`  | Stop local PostgreSQL           |
| `pnpm run db:generate`  | Generate migration files        |
| `pnpm run db:migrate`   | Apply migrations                |
| `pnpm run db:studio`    | Open Drizzle Studio             |

## UI Components And shadcn

For UI component selection, shadcn install decisions, and visual coherence rules, use [UI guidelines](./ui.md). Keep the detailed UI policy there rather than duplicating it in workflow docs.

## Testing

Follow [Testing policy](./testing.md). Do not add or run tests unless requested, except when an existing task explicitly calls for them.

## Worktrees

Work in the main checkout. Do not create git worktrees or start sessions in a worktree unless the user asks for one.

## Commits

Use Conventional Commit format. The tracked pre-commit hook formats-checks and lints only the staged files, and the pre-push hook runs the full `pnpm run check`; neither modifies or restages files. Do not rely on them as hidden validation when the user has not approved checks.
