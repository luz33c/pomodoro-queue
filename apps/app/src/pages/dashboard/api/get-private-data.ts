import { useQuery } from "@tanstack/react-query";

import { orpc } from "#/shared/api/orpc";

export function getPrivateDataQueryOptions() {
  return orpc.private.data.queryOptions();
}

export function useGetPrivateDataQuery() {
  return useQuery(getPrivateDataQueryOptions());
}
