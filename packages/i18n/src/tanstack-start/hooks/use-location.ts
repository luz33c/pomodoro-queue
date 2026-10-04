import {
  type AnyRouter,
  type RegisteredRouter,
  type RouterState,
  useLocation as rawUseLocation
} from "@tanstack/react-router";

import { stripLocalePrefix } from "#@/tanstack-start/lib/strip-locale-prefix";

type ParsedLocation = RouterState<RegisteredRouter["routeTree"]>["location"];

/**
 * Localized wrapper for TanStack Router's `useLocation`.
 * Automatically strips the `/{-$locale}` prefix from `pathname`, so consumers
 * always receive clean paths like `/app/library` instead of `/en/app/library`.
 */
export function useLocation(): ParsedLocation;
export function useLocation<TSelected>(opts: {
  select: (location: ParsedLocation) => TSelected;
}): TSelected;
export function useLocation<TSelected = unknown>(opts?: {
  select?: (location: ParsedLocation) => TSelected;
}): ParsedLocation | TSelected {
  // The explicit type arguments are intentional. Against the registered router with
  // `defaultStructuralSharing: true`, TanStack Router requires `select` results to be
  // provably JSON-serializable (`ValidateJSON<TSelected>`), which cannot be expressed for
  // an unconstrained generic wrapper. Calling through `AnyRouter` skips only that
  // compile-time check; runtime behaviour, including structural sharing, is unchanged,
  // and the overloads above restore the caller's precise type.
  return rawUseLocation<AnyRouter, unknown, boolean>({
    select: (loc) => {
      const stripped = {
        ...loc,
        pathname: stripLocalePrefix(loc.pathname)
      } as ParsedLocation;
      return opts?.select ? opts.select(stripped) : stripped;
    }
  }) as ParsedLocation | TSelected;
}
