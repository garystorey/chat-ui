import { useEffect } from "react";

/**
 * Run an async effect with an AbortSignal provided. The effect should return
 * either void or a cleanup function. The signal will be aborted on unmount.
 */
type AbortableEffectCleanup = () => void;
type AbortableEffectResult =
  | void
  | AbortableEffectCleanup
  | Promise<void | AbortableEffectCleanup>;

const useAbortableEffect = (
  effect: (signal: AbortSignal) => AbortableEffectResult,
  deps: readonly unknown[],
) => {
  useEffect(() => {
    const controller = new AbortController();
    let cleanup: void | AbortableEffectCleanup;
    let didDispose = false;

    const applyCleanup = (nextCleanup: void | AbortableEffectCleanup) => {
      if (typeof nextCleanup !== "function") {
        return;
      }

      if (didDispose) {
        nextCleanup();
        return;
      }

      cleanup = nextCleanup;
    };

    const run = async () => {
      try {
        const res = effect(controller.signal);
        if (res && typeof (res as Promise<void>).then === "function") {
          applyCleanup(await res);
        } else {
          applyCleanup(res as void | AbortableEffectCleanup);
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
      didDispose = true;
      controller.abort();
      cleanup?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};

export default useAbortableEffect;
