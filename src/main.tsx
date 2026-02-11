import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ErrorBoundary, ErrorFallback, ToastProvider } from "./components";
import "./styles/global.css";
import "./styles/highlight.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
      retry: 3,
    },
    mutations: {
      retry: 0,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary
        fallback={({ error, resetErrorBoundary }) => (
          <ErrorFallback
            error={error}
            resetErrorBoundary={() => {
              queryClient.clear();
              resetErrorBoundary();
            }}
          />
        )}
      >
        <ToastProvider>
          <App />
        </ToastProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  </React.StrictMode>,
);
