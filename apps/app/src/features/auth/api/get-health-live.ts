import { useQuery } from "@tanstack/react-query";

import { orpc } from "#/lib/api-client/orpc";

export function getHealthLiveQueryOptions() {
  return orpc.health.live.queryOptions();
}

export function useGetHealthLiveQuery() {
  return useQuery(getHealthLiveQueryOptions());
}
