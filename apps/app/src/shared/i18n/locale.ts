import { baseLocale, locales, overwriteGetLocale } from "@tsu-stack/i18n/runtime";

type Locale = (typeof locales)[number];

const LOCALE_STORAGE_KEY = "locale";

function isLocale(value: unknown): value is Locale {
  return locales.includes(value as Locale);
}

function readStoredLocale(): Locale | null {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    return isLocale(stored) ? stored : null;
  } catch {
    return null;
  }
}

function matchNavigatorLocale(): Locale | null {
  for (const language of navigator.languages) {
    const [primary] = language.split("-");
    if (isLocale(language)) {
      return language;
    }
    if (isLocale(primary)) {
      return primary;
    }
  }
  return null;
}

/**
 * Resolves the locale once at startup.
 *
 * The compiled Paraglide runtime is shared with apps/web and uses its URL strategy, so the app
 * overrides getLocale instead of recompiling. The app has no locale prefix in its routes.
 */
export function initLocale() {
  const locale = readStoredLocale() ?? matchNavigatorLocale() ?? baseLocale;
  overwriteGetLocale(() => locale);
  document.documentElement.lang = locale;
}

/** Persists the locale and reloads, as Paraglide's own setLocale does by default. */
export function switchLocale(locale: Locale) {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    return;
  }
  window.location.reload();
}
