import useAbortableEffect from "./useAbortableEffect";

type AsyncAction = (signal: AbortSignal) => Promise<void> | void;

/**
 * Run an async action with an AbortSignal and standardized error handling.
 * Errors are forwarded to `onError` unless the signal has been aborted.
 */
export default function useAsyncAction(
  action: AsyncAction,
  deps: readonly unknown[],
  onError?: (error: unknown) => void,
) {
  useAbortableEffect(
    async (signal) => {
      try {
        await action(signal);
      } catch (err) {
        if (signal.aborted) return;
        try {
          onError?.(err);
        } catch {}
      }
    },
    deps,
  );
}
