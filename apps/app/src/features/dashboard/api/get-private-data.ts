import { useQuery } from "@tanstack/react-query";

import { orpc } from "#/lib/api-client/orpc";

export function getPrivateDataQueryOptions() {
  return orpc.private.data.queryOptions();
}

export function useGetPrivateDataQuery() {
  return useQuery(getPrivateDataQueryOptions());
}
