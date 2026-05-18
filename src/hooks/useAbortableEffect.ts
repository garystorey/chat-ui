import { useEffect } from "react";

/**
 * Run an async effect with an AbortSignal provided. The effect should return
 * either void or a cleanup function. The signal will be aborted on unmount.
 */
const useAbortableEffect = (
  effect: (signal: AbortSignal) => Promise<void> | void,
  deps: readonly unknown[],
) => {
  useEffect(() => {
    const controller = new AbortController();
    let maybeCleanup: void | (() => void);

    const run = async () => {
      try {
        const res = effect(controller.signal);
        if (res && typeof (res as Promise<void>).then === "function") {
          await res;
        }
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }
        throw err;
      }
    };

    void run();

    return () => {
      controller.abort();
      if (typeof maybeCleanup === "function") {
        try {
          maybeCleanup();
        } catch {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};

export default useAbortableEffect;
