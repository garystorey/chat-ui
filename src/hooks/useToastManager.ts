import { useCallback, useEffect, useRef, useState } from "react";
import type { ToastItem, ToastType } from "../types";
import { getId } from "../utils";

export type ToastOptions = {
  type: ToastType;
  message: string;
  duration?: number;
};

const useToastManager = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastTimeoutsRef = useRef(new Map<string, number>());

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timeout = toastTimeoutsRef.current.get(id);
    if (timeout) {
      window.clearTimeout(timeout);
      toastTimeoutsRef.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    ({ type, message, duration }: ToastOptions) => {
      const id = getId();
      const resolvedDuration = duration ?? (type === "error" ? 8000 : 4000);
      setToasts((current) => [...current, { id, type, message }]);

      if (resolvedDuration > 0) {
        const timeout = window.setTimeout(() => {
          dismissToast(id);
        }, resolvedDuration);
        toastTimeoutsRef.current.set(id, timeout);
      }
    },
    [dismissToast],
  );

  useEffect(() => {
    return () => {
      toastTimeoutsRef.current.forEach((timeout) =>
        window.clearTimeout(timeout),
      );
      toastTimeoutsRef.current.clear();
    };
  }, []);

  return { toasts, showToast, dismissToast };
};

export default useToastManager;
