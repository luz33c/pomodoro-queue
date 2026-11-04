# UI Guidelines

Use this when adding or refactoring UI in `apps/web` or reusable components in `packages/ui`.

This file is the source of truth for app UI composition, extraction decisions, and shared component boundaries. For route/file placement, follow [TanStack patterns](./tanstack-patterns.md). For complex client-owned state shared across components, follow [Zustand state management](./zustand.md).

## Goals

- Prefer existing primitives from `@uni-stack/ui` before creating new app-local ones.
- Keep `packages/ui` reusable and app-agnostic.
- Keep route files thin and UI composition in pages, features, widgets, or `shared/ui`.
- Extract shared UI only when reuse and app-agnostic boundaries are real.

## Default Sources

- Prefer existing components from `@uni-stack/ui/components/*` before creating new app-local primitives.
- Prefer app wrappers from `apps/web/src/shared/ui` when the app already owns routing, image, locale, or other app-specific integration details.
- Use `lucide-react` for icons unless an existing asset or brand graphic is the better fit.
- Use `@uni-stack/ui/lib/utils` `cn(...)` for class composition.
- Theme tokens (`@uni-stack/ui/styles/theme.css`) and font faces (`@uni-stack/ui/styles/fonts.css`) live in `packages/ui`; each app imports them from its own `app.css`. An app that imports `fonts.css` must also depend on the `@fontsource` packages it names, because Vite resolves those `url()` specifiers from the importing app's stylesheet.

## App Composition

- Build page UI in `pages/`, composite sections in `widgets/` and `features/`, and app-level primitives in `shared/ui`.
- Prefer composing `@uni-stack/ui` primitives instead of duplicating styling across many leaf components.
- Keep route files thin. Put UI composition in page, feature, widget, or shared components, not in route files.

## Extraction Rule

- Extract a component to `packages/ui` when it is reusable, app-agnostic, and the shared package can own its styling and accessibility.
- Keep a component app-local when it depends on route params, current locale, auth state, app SEO, app config, or other app-owned integrations.
- If reuse is still speculative, keep the component app-local first and extract after a second real use case.

## Composite Components

`packages/ui/components/` holds two kinds of components:

- Base components sit flat in `components/` (`button.tsx`, `sheet.tsx`). Most come from the shadcn CLI, which only writes to this folder.
- Composite components sit in a category folder (`components/chat/thinking.tsx`) and are written by hand from base components. They stay app-agnostic like the rest of `packages/ui`; components bound to business data or product flows stay in `apps/app`.

Rules for composite components:

- Base components never import from a category folder.
- Drive them through props. The caller streams rows, flips the status, and owns playback timers; the component keeps only its own UI state, such as which rows are expanded.
- Take copy through props with English defaults so apps can pass `m.*()` messages. Do not import `@uni-stack/i18n`.
- Put keyframes in `packages/ui/styles/animations.css` and apply infinite ones with `motion-safe:` (`motion-safe:animate-shimmer-text`). The reduced-motion rule in `globals.css` lives in the base layer, so it does not override utility classes or inline styles.
- Code adapted from a third party keeps a header comment and an entry in `packages/ui/THIRD_PARTY_NOTICES.md`.
- Every composite component has a demo in [apps/preview-ui](../apps/preview-ui/AGENTS.md).

## Shared Package Boundaries

- `packages/ui` must not import from `apps/*`, TanStack Router, or app env modules.
- Keep semantic HTML, styling, layout, and accessibility inside the shared component.
- Keep CDN, proxy, locale, router, and analytics behavior outside shared UI primitives.
- Provide sensible defaults so shared components still work without injected app-specific dependencies.
- Keep colocated shared UI state near the component family that owns it.

## Dependency Injection

When a shared component needs an app-specific primitive, inject it instead of importing it.

- Navigation: accept `linkComponent?: React.ElementType`, default to `"a"`.
- Media: accept `imageComponent?: React.ElementType`, default to the shared `packages/ui` image primitive or a semantic fallback.
- Future wrappers: apply the same pattern for things like video, avatar, markdown, or analytics-aware buttons.
- Keep injected component props optional and forward the smallest useful prop surface.
- When router links may need either router `to` or plain `href`, support both and let the injected link decide what to use.
- For configurable media, keep related props grouped in a nested object instead of scattering env-specific props across the component API.

## Decision Rule

- Use prop injection when only data or one-off config changes per usage.
- Use component injection when behavior or implementation changes per app.
- Prefer component injection when the same app-specific dependency would otherwise be repeated across many call sites.
- For shared UI state that coordinates sibling components inside `packages/ui`, prefer a small colocated Zustand store over prop drilling or React context only to shuttle simple open/close state. Follow [Zustand state management](./zustand.md) for store shape and selectors.

Reference pattern:

```tsx
type CardProps = {
  linkComponent?: React.ElementType;
  imageComponent?: React.ElementType;
  href: string;
  image?: {
    src: string;
    alt?: string;
    siteBaseUrl?: string;
    imgProxyBaseUrl?: string;
  };
};
```

## shadcn Usage

- The repo uses shadcn with the `base-vega` style (Base UI primitives), `neutral` base color, CSS variables, and Lucide icons.
- Add reusable shadcn-derived components to `packages/ui` when they can stay app-agnostic.
- Keep a component in `apps/web` when it depends directly on app routing, auth, SEO, locale, or app config.
- Keep app-level wrappers and glue code in `apps/web/src/shared/ui`.
- Add components with `pnpm run ui add <name>`, then check the result: the CLI can mistake the registry's `cn` helper for an npm package, adding `cn` to `packages/ui/package.json`, the catalog, and the lockfile, and writing `import { cn } from "cn"`. Revert those and import `cn` from `#/lib/utils`.

## Base UI Composition

`packages/ui` wraps `@base-ui/react`; `radix-ui` is not a dependency. For API differences from Radix-based examples (Select `items`, ToggleGroup, Slider, Accordion), see the vendored [base-vs-radix rules](./skills/shadcn/rules/base-vs-radix.md). The rules below take precedence over it.

- Compose with `render`, never `asChild`: `<DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>`. Nest `render` elements to stack triggers (`<TooltipTrigger render={<DropdownMenuTrigger render={<Button />} />} />`).
- Links that look like buttons stay links: put `buttonVariants(...)` on the link element (`<Link className={buttonVariants({ variant: "outline" })} to="/">`). Do not render links through `<Button render>`; Base UI's Button adds `role="button"` and button key handling. This overrides the vendored rule that suggests `nativeButton={false}` for links.
- Use `DropdownMenuLinkItem` for links inside menus, for example `<DropdownMenuLinkItem render={<Link to="/terms-of-service" />}>`.
- Put `DropdownMenuLabel` inside `DropdownMenuGroup` or `DropdownMenuRadioGroup`; Base UI throws otherwise.
- `Button` defaults to `type="button"`; set `type="submit"` explicitly.
- When `render` swaps a button-like part for a non-button element that is not a link, set `nativeButton={false}`.
- Shared components that need a polymorphic root use Base UI `useRender` and `mergeProps`, not a Slot.
- Style state with the variants in `packages/ui/styles/shadcn.css` (`data-open:`, `data-closed:`, `data-checked:`, `data-disabled:`) and `data-starting-style:` / `data-ending-style:` for transitions. Use `--anchor-width`, `--available-height`, and `--transform-origin`; `--radix-*` variables no longer exist.

## Images And Links

- Prefer app-owned wrappers for images or routing-aware links when the app needs locale, router, or env-specific behavior.
- Shared components should accept injected link or image components instead of importing app wrappers directly.
- Keep base URL, CDN, and proxy decisions outside shared primitives.

## Do And Don't

- Do keep `packages/ui` reusable and free of app imports.
- Do keep styling and accessibility inside the shared component.
- Do extract app-specific wrappers into `apps/web/src/shared/ui`.
- Don't hardcode router, locale, analytics, or env behavior into `packages/ui`.
- Don't introduce React context or excessive prop drilling for shared UI state when a colocated store is enough.
- Don't expose app-specific implementation details unless reuse requires them.
