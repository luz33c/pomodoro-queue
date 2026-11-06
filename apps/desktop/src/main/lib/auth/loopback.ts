// The OAuth redirect target: a one-shot HTTP server on the loopback interface (RFC 8252 §7.3).
// Custom URL schemes would need the app in /Applications on macOS and are not supported on Windows or Linux.

// Every port here is a redirect URI of the Clerk OAuth application: http://127.0.0.1:<port>/callback.
// The next port is tried when one is taken.
const LOOPBACK_PORTS = [47823, 47824, 47825];
const LOOPBACK_HOST = "127.0.0.1";
const CALLBACK_PATH = "/callback";

export type CallbackResult = { kind: "code"; code: string } | { kind: "error"; error: string };

/** Turns the callback into the message the browser tab shows. */
type CallbackHandler = (result: CallbackResult) => Promise<string>;

export type Loopback = {
  redirectUri: string;
  close: () => void;
};

function page(message: string) {
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>tsu!stack</title>` +
      `<body style="font:16px system-ui;display:grid;place-items:center;height:90vh;margin:0">` +
      `<p>${message}</p></body>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

function readCallback(url: URL): CallbackResult | null {
  const error = url.searchParams.get("error");
  if (error) {
    return { error, kind: "error" };
  }
  const code = url.searchParams.get("code");
  return code ? { code, kind: "code" } : null;
}

/**
 * Listens for the authorization response. Requests with another path or state are rejected and
 * the server keeps waiting, so a stray request cannot end the sign-in. Returns null when every port is taken.
 */
export function startLoopback({
  onCallback,
  state
}: {
  onCallback: CallbackHandler;
  state: string;
}): Loopback | null {
  let handled = false;

  for (const port of LOOPBACK_PORTS) {
    let server: ReturnType<typeof Bun.serve>;
    try {
      server = Bun.serve({
        async fetch(request) {
          const url = new URL(request.url);
          if (url.pathname !== CALLBACK_PATH) {
            return new Response("Not found", { status: 404 });
          }

          const result = readCallback(url);
          if (handled || !result || url.searchParams.get("state") !== state) {
            return new Response("This sign-in link is not valid anymore.", { status: 400 });
          }

          handled = true;
          return page(await onCallback(result));
        },
        hostname: LOOPBACK_HOST,
        port
      });
    } catch (error) {
      console.warn(`Loopback port ${port} is not available`, error);
      continue;
    }

    return {
      // stop(false) lets the response that ends the sign-in finish sending.
      close: () => void server.stop(false),
      redirectUri: `http://${LOOPBACK_HOST}:${port}${CALLBACK_PATH}`
    };
  }

  return null;
}
