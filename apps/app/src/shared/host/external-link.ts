import { host } from "#/shared/host/index";

/**
 * Anchor props for links that leave the app.
 *
 * The desktop shell blocks navigations away from its own origins and hands them to the system browser.
 * The CEF renderer drops target="_blank", so desktop links navigate in place and never need a new window.
 */
export const externalLinkProps: { rel?: string; target?: string } =
  host === "desktop" ? {} : { rel: "noopener noreferrer", target: "_blank" };
