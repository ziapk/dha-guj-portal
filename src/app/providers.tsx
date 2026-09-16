"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "antd";
import { useState, type ReactNode } from "react";
import { ApiError } from "@/lib/api-client";
import { ThemeProvider } from "@/theme/theme-provider";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => !(error instanceof ApiError && error.status < 500) && failureCount < 2,
          },
        },
      }),
  );

  return (
    <ThemeProvider>
      <App>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </App>
    </ThemeProvider>
  );
}
