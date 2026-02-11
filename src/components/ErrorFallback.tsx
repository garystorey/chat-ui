import type { FC } from "react";

type ErrorFallbackProps = {
  error: Error;
  resetErrorBoundary: () => void;
};

const ErrorFallback: FC<ErrorFallbackProps> = ({ error, resetErrorBoundary }) => {
  return (
    <main role="alert" style={{ padding: "2rem", maxWidth: "48rem", margin: "0 auto" }}>
      <h1>Something went wrong.</h1>
      <p>Please try reloading the app.</p>
      <pre style={{ whiteSpace: "pre-wrap" }}>{error.message}</pre>
      <button type="button" onClick={resetErrorBoundary}>
        Try again
      </button>
    </main>
  );
};

export default ErrorFallback;
