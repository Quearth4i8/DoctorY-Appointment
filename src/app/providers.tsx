"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // What she sees is only as fresh as two hops allow: his app syncs
            // to Supabase every 15s, and this polls Supabase. Both halves have
            // to be short or the slower one sets the pace — 20s here against a
            // 60s sync was the reason a change could take over a minute to land.
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
            refetchInterval: 8_000,
            staleTime: 3_000,
            retry: 1,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
