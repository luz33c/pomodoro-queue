import { ELECTRIC_PROTOCOL_QUERY_PARAMS } from "@electric-sql/client";

import { ENV_SERVER } from "@tsu-stack/env/server/env";

import { authenticateClerkRequest } from "#/server/clerk";
import { type ResolvedShape, resolveShape } from "#/sync/shapes";

/** Response headers the Electric client reads. Cross-origin callers see them only when CORS exposes them. */
export const ELECTRIC_EXPOSED_HEADERS = [
  "electric-cursor",
  "electric-handle",
  "electric-has-data",
  "electric-internal-known-error",
  "electric-offset",
  "electric-schema",
  "electric-snapshot",
  "electric-up-to-date",
  "retry-after"
];

function shouldDropUpstreamHeader(name: string) {
  // fetch has already decoded the body, and CORS belongs to the server's own middleware
  return (
    name === "content-encoding" || name === "content-length" || name.startsWith("access-control-")
  );
}

/**
 * Forwards a shape request to Electric. The table, columns, and owner filter come from the server;
 * the client only contributes Electric's protocol parameters such as `offset`, `handle`, and `live`.
 */
async function proxyShape(
  request: Request,
  shape: ResolvedShape,
  userId: string
): Promise<Response> {
  if (!ENV_SERVER.ELECTRIC_URL) {
    return Response.json({ message: "Sync is not configured on this server" }, { status: 503 });
  }

  const incoming = new URL(request.url);
  const upstream = new URL("/v1/shape", ENV_SERVER.ELECTRIC_URL);

  for (const key of ELECTRIC_PROTOCOL_QUERY_PARAMS) {
    const value = incoming.searchParams.get(key);
    if (value !== null) {
      upstream.searchParams.set(key, value);
    }
  }
  upstream.searchParams.set("table", shape.table);
  upstream.searchParams.set("columns", shape.columns);
  upstream.searchParams.set("where", shape.where);
  upstream.searchParams.set("params[1]", userId);
  if (ENV_SERVER.ELECTRIC_SECRET) {
    upstream.searchParams.set("secret", ENV_SERVER.ELECTRIC_SECRET);
  }

  let response: Response;
  try {
    response = await fetch(upstream, { signal: request.signal });
  } catch {
    return Response.json({ message: "Sync service is unavailable" }, { status: 502 });
  }

  const headers = new Headers();
  for (const [name, value] of response.headers) {
    if (!shouldDropUpstreamHeader(name)) {
      headers.append(name, value);
    }
  }

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText
  });
}

/** Serves `GET /shape/:name/:version`: checks the Clerk bearer token, then forwards the shape. */
export async function handleShapeRequest(
  request: Request,
  name: string,
  version: string
): Promise<Response> {
  const auth = await authenticateClerkRequest(request);
  if (!auth) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const shape = resolveShape(name, version);
  if (!shape) {
    return Response.json({ message: "Unknown shape" }, { status: 404 });
  }

  return proxyShape(request, shape, auth.userId);
}
