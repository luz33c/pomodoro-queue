import { type NavigateOptions } from "@tanstack/react-router";
import { useNavigate as rawUseNavigate } from "@tanstack/react-router";

import { baseLocale, getLocale } from "#@/paraglide/runtime";
import { LOCALE_ROUTE_PREFIX } from "#@/tanstack-start/constants/index";
import { stripLocalePrefix } from "#@/tanstack-start/lib/strip-locale-prefix";
import { type LocalizedNavigate, type NavigateProps } from "#@/tanstack-start/types/index";

/**
 * Re-applies the `/{-$locale}` route prefix to a locale-stripped app path.
 * Stripping first keeps the result stable even if a caller passes an already prefixed path.
 */
function localizeRoutePath(path: string): string {
  return `/${LOCALE_ROUTE_PREFIX}${stripLocalePrefix(path)}`;
}

export function useNavigate<TDefaultFrom extends string = string>(_defaultOpts?: {
  from?: TDefaultFrom;
}): LocalizedNavigate<TDefaultFrom> {
  const navigate = rawUseNavigate(
    _defaultOpts?.from
      ? {
          from: localizeRoutePath(_defaultOpts.from) as NavigateOptions["from"]
        }
      : undefined
  );

  const locale = getLocale();

  return ((args: NavigateProps): Promise<void> => {
    const { from, params, to, ...rest } = args;

    return navigate({
      ...rest,
      // Both `from` and `to` arrive locale-stripped (see `LocalizedNavigate`), so each
      // gets the locale prefix re-applied before reaching TanStack Router. Spreading
      // `from` untouched would hand the router a path outside its route tree.
      ...(from === undefined ? {} : { from: localizeRoutePath(from) as NavigateOptions["from"] }),
      params: {
        locale: locale === baseLocale ? undefined : locale,
        ...(typeof params === "object" ? params : {})
      },
      to: localizeRoutePath(to) as NavigateOptions["to"]
    });
  }) as unknown as LocalizedNavigate<TDefaultFrom>;
}
