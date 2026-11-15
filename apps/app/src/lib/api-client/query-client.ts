import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: unknown) => {
        // oRPC 2.0 client errors carry `code`, not `status`
        if (
          error instanceof Error &&
          "code" in error &&
          (error.code === "UNAUTHORIZED" || error.code === "FORBIDDEN")
        ) {
          return false;
        }
        return failureCount < 2;
      },
      staleTime: 1000 * 60 * 2
    }
  }
});
