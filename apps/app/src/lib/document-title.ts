import { appConfig } from "#/config/app";

/** `<page> · <app name>`, or the app name alone for routes without their own title. */
export function documentTitle(page?: string) {
  return page ? `${page} · ${appConfig.appName}` : appConfig.appName;
}
