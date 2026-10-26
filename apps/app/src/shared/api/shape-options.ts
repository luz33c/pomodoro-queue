import { snakeCamelMapper } from "@electric-sql/client";

import { SHAPE_VERSIONS, type ShapeName } from "@tsu-stack/core/sync";
import { ENV_APP } from "@tsu-stack/env/app/env";

import { getAuthToken } from "#/shared/api/auth-token";

/** Stream options for a server shape behind `GET /shape/:name/:version`. */
export function getShapeOptions(name: ShapeName) {
  return {
    columnMapper: snakeCamelMapper(),
    headers: {
      // Resolved per request, so long-running streams never send an expired Clerk token
      Authorization: async () => `Bearer ${(await getAuthToken()) ?? ""}`
    },
    parser: {
      // Electric sends timestamps as text; rows carry Date like the Drizzle table
      timestamptz: (value: string) => new Date(value)
    },
    url: `${ENV_APP.VITE_SERVER_URL.replace(/\/$/, "")}/shape/${name}/${SHAPE_VERSIONS[name]}`
  };
}
