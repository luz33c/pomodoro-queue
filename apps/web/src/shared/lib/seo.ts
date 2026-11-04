import { resolvePublicAssetUrl } from "@uni-stack/core/assets";
import { type Locale } from "@uni-stack/i18n/runtime";
import {
  generateTanStackStartSeo,
  type GenerateTanStackStartSeoParams,
  type TanStackStartSeoAlternates,
  type TanStackStartSeoSite
} from "@uni-stack/seo";

import { appConfig } from "#/config/app.config";

// Open Graph wants language_TERRITORY; adding a locale fails to compile until it is listed here
const openGraphLocales = { en: "en_US", zh: "zh_CN" } satisfies Record<Locale, string>;

const site = {
  applicationName: appConfig.site.longName,
  baseUrl: appConfig.site.baseUrl,
  defaultDescription: appConfig.site.description,
  defaultImages: [
    {
      alt: appConfig.site.longName,
      height: 630,
      type: "image/png",
      url: resolvePublicAssetUrl(appConfig.site.url, "/og/index.png"),
      width: 1200
    }
  ],
  defaultTitle: appConfig.site.longName,
  openGraphLocales,
  siteName: appConfig.site.longName,
  titleTemplate: `%s | ${appConfig.site.shortName}`
} satisfies TanStackStartSeoSite;

type AppSeoOptions = Omit<GenerateTanStackStartSeoParams, "alternates" | "site"> & {
  alternates?: Omit<TanStackStartSeoAlternates, "baseLocale" | "locales">;
};

export function generateAppSeo({ alternates, ...options }: AppSeoOptions) {
  return generateTanStackStartSeo({
    ...options,
    alternates: alternates
      ? {
          ...alternates,
          baseLocale: appConfig.i18n.baseLocale,
          locales: appConfig.i18n.locales
        }
      : undefined,
    site
  });
}
