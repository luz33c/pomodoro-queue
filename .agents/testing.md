# Testing Policy

This document is the authoritative testing policy for contributors and AI agents in this repository.

## Core Policy

- Assume no tests unless explicitly requested.
- Never auto-add tests to feature work.
- Respect unit and e2e conventions enumerated below.
- Use the official Vitest package for new test environments.
- Do not generate, modify, suggest, or proactively add tests unless the developer explicitly asks.
- Implementation requests should return implementation only unless tests are explicitly requested.
- When asking whether to run tests, use [Choice flows](./choice-flows.md) and prefer native approval or structured input before any plain text fallback.
- Inspect nearby tests before generating new ones.
- Follow the repository's standalone Vitest conventions.

## Test Commands

Canonical commands:

- `pnpm run test:unit:run`
- `pnpm run test:e2e:run`

## Test Locations

Unit tests:

- `src/**/__tests__/*.test.ts`

End-to-end tests:

- `__e2e__/**/*.spec.ts`

Use `__e2e__` as the project convention for end-to-end tests.

## Vitest Setup Rule

When tests are explicitly requested and the package or app does not already have Vitest configured:

1. Add the official `vitest` package through the workspace catalog.
2. Reuse a nearby Vitest config when one already covers the package.
3. Otherwise, add `vitest.config.ts` in the package or app being tested.
4. Keep test scripts explicit and run them through pnpm.

Default config:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/__tests__/**/*.test.ts"]
  }
});
```

Explicit rules:

- Prefer `vitest.config.ts` for test-only configuration.
- Keep Web build configuration in `vite.config.ts`; do not couple unrelated package tests to the Web Vite config.
- Follow the official Vitest configuration documentation: https://vitest.dev/config/

## When Tests Are Explicitly Requested

Generate behavior-driven tests that prioritize:

- happy paths
- edge cases and fallback precedence
- pathological inputs
- regression-prone cases
- contract invariants

Prefer:

- table-driven tests
- testing public contracts over internals
- fixtures and builders to reduce duplication
- adding regression tests for bug fixes
- mirroring nearby test structure
