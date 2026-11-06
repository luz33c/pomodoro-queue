# TypeScript Conventions

Use this for repo-wide TypeScript structure, import boundaries, and schema placement.

For shared cross-package domain contracts in `packages/core`, follow [Core package patterns](./core.md).

## Shared Schema Pattern

For shared package domains, prefer a small domain module over ad hoc type dumping grounds.

```text
src/<domain>/
	constants.ts
	types.ts
	utils.ts
	index.ts
```

For app-local or slice-local code, keep schemas next to the owning route, feature, or package instead of creating a global type folder.

## Schema Placement

- Keep schemas close to the owning slice or package.
- For app-local or package-local schemas, the default pattern is `types/thing.type.ts`.
- When the same schema, enum, or default is consumed across packages, move it into `packages/core` instead of recreating literal unions in `apps/web` or `packages/api`.

Example package-local schema:

```ts
export const ThingSchema = z.object({ ... });
export type Thing = z.infer<typeof ThingSchema>;
```

Both schema (`ThingSchema`) and type (`Thing`) are named exports.

When a schema is shared across package boundaries, export the schema and inferred type from the owning shared module and import that same schema everywhere else.

If the frontend needs labels, options, or defaults for a shared enum, derive them from the shared schema or shared helpers instead of creating a second local union.

## Module Resolution

`tools/tsconfig/tsconfig.base.json` uses `Bundler` module resolution with `resolvePackageJsonImports`.

### Import Rules

1. Across workspace projects, import by package name through the target's `exports`: `@uni-stack/<package>/<subpath>`. `@uni-stack/*` names are package exports, not path aliases.
2. Inside a workspace project, import across folders with `#/`, for example `import { db } from "#/client"`. This applies to every package and app.
3. Relative imports only reach the same folder or below (`./`), and only in three places:
   - `apps/web` and `apps/preview-ui`: inside one FSD slice, such as a slice's `index.ts` re-exporting its own `ui/` or a component importing a sibling. `apps/app`: inside one feature folder or one `components/` subfolder, such as a feature's `index.ts` re-exporting its `components/` or a component importing a sibling. Anything that needs `../` uses `#/` instead; `import/no-relative-parent-imports` rejects `../`, and `fsd/no-relative-imports` rejects relative imports into another slice or feature.
   - `apps/extension`: files and styles inside one entrypoint folder, such as `./App` and `./App.css`.
   - `apps/desktop`: every file in `src/` except imports of `src/shared/`. Electrobun's bundler does not resolve `#/`, so `apps/desktop` maps `#shared/*` instead of `#/*` and uses it only to reach `src/shared/` from `src/main/` and `src/preload/`. See [Desktop](./desktop.md).

Packages and `apps/server` never use relative imports. `apps/server` runs package source directly on Node in development, and Node does not resolve extensionless relative paths.

### `#/` Mappings

Each project declares `#/` in the `imports` field of its own `package.json`. Resolution is scoped to that package, so the same prefix never leaks between projects.

| Project                                     | `imports`                                                                                                                                                                                                         |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/*` except `ui`, and `apps/server` | `"#/*": "./src/*.ts"`; `packages/i18n` adds `"#/paraglide/*": "./src/paraglide/*.js"`                                                                                                                             |
| `packages/ui`                               | `"#/components/*": "./components/*.tsx"`, `"#/hooks/*": "./hooks/*.ts"`, `"#/lib/*": "./lib/*.ts"`                                                                                                                |
| `apps/web`                                  | `"#/shared/providers/*": "./src/shared/providers/*.tsx"`, `"#/shared/ui/*": "./src/shared/ui/*.tsx"`, `"#/*.css": "./src/*.css"`, `"#/*": "./src/*.ts"`                                                           |
| `apps/app`                                  | `"#/lib/host/runtime"` (conditional: `desktop` or `default`), `"#/app/providers/*": "./src/app/providers/*.tsx"`, `"#/components/*": "./src/components/*.tsx"`, `"#/*.css": "./src/*.css"`, `"#/*": "./src/*.ts"` |
| `apps/preview-ui`                           | `"#/shared/ui/*": "./src/shared/ui/*.tsx"`, `"#/*.css": "./src/*.css"`, `"#/*": "./src/*.ts"`                                                                                                                     |
| `apps/native`                               | `"#/components/*": "./components/*.tsx"`, `"#/*": "./*.ts"`                                                                                                                                                       |
| `apps/extension`                            | `"#/*": "./*.ts"`                                                                                                                                                                                                 |
| `apps/desktop`                              | `"#shared/*": "./src/shared/*.ts"` (no `#/`; see rule 3)                                                                                                                                                          |

- TypeScript and Metro resolve the mapped path literally, without adding extensions or `index`. Each rule names one extension, and a directory barrel is imported as `#/<dir>/index`.
- A folder of `.tsx` files needs its own rule. In `apps/web`, other `.tsx` files sit in slice `ui/` folders and are reached with `./` from their own slice, or from outside through the slice's `index.ts`. In `apps/app`, feature `components/` are reached the same way through the feature's `index.ts`.
- shadcn `components.json` aliases use `#/` (`#/components`, `#/lib/utils`, `#/shared/ui`). The CLI writes extensionless imports, which resolve through the folder rules above.
- Never declare `#/` in tsconfig `paths`. TypeScript applies `paths` to every file in the program, so an app's `#/*` path would also rewrite the `#/` imports of package sources the app compiles. The only tsconfig path left is `@uni-stack/ui/*` in `apps/web`, kept for the shadcn CLI.

## `lib/` vs `utils/`

| Directory | Contains                                          |
| --------- | ------------------------------------------------- |
| `lib/`    | Business logic, library integrations, API clients |
| `utils/`  | Pure stateless helper functions                   |

In `packages/core`, keep shared schemas in domain `types.ts` files and pure domain helpers in `utils.ts`. Do not move router, DB, or React logic there.

## Linting (Oxlint)

Inline disable syntax:

```ts
// oxlint-disable-next-line no-console
console.log("debug");

// oxlint-disable-line no-console, no-plusplus
console.log(x++);

/* oxlint-disable no-console */
// Disables for rest of file
```

ESLint-style comments (`eslint-disable-*`) also work for compatibility.

## Import Sorting (auto-enforced by Oxfmt)

Order: builtins → external → `@uni-stack/*` → `#/shared` → `#/entities` → `#/features` → `#/widgets` → `#/pages` → other `#/` → relative → styles
