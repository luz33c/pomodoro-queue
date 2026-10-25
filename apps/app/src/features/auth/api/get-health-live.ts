import { useQuery } from "@tanstack/react-query";

import { orpc } from "#/shared/api/orpc";

export function getHealthLiveQueryOptions() {
  return orpc.health.live.queryOptions();
}

export function useGetHealthLiveQuery() {
  return useQuery(getHealthLiveQueryOptions());
}
