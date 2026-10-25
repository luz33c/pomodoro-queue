import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: unknown) => {
        if (
          error instanceof Error &&
          "status" in error &&
          [401, 403].includes((error as { status: number }).status)
        ) {
          return false;
        }
        return failureCount < 2;
      },
      staleTime: 1000 * 60 * 2
    }
  }
});
