import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: (failureCount, error) => {
        if (error?.statusCode === 429 || error?.status === 429 || error?.response?.status === 429) {
          return false; // Never retry on 429 Rate Limit
        }
        return failureCount < 1;
      },
      staleTime: 5 * 60 * 1000,
    },
  },
});
