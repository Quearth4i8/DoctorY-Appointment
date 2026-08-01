"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Keep the secretary's view fresh against the shared doctor.db:
            // refetch on focus and on a gentle interval so changes made in the
            // doctor's desktop app appear here automatically.
            refetchOnWindowFocus: true,
            refetchInterval: 20_000,
            staleTime: 5_000,
            retry: 1,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
