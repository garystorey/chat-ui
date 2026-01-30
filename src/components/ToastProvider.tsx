import { createContext, useMemo, type ReactNode } from "react";
import useToastManager, { type ToastOptions } from "../hooks/useToastManager";
import ToastStack from "./Toast";

export type ToastContextValue = {
  showToast: (options: ToastOptions) => void;
  dismissToast: (id: string) => void;
};

export const ToastContext = createContext<ToastContextValue | null>(null);

type ToastProviderProps = {
  children: ReactNode;
};

const ToastProvider = ({ children }: ToastProviderProps) => {
  const { toasts, showToast, dismissToast } = useToastManager();
  const contextValue = useMemo(
    () => ({ showToast, dismissToast }),
    [showToast, dismissToast],
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
};

export type { ToastOptions };
export default ToastProvider;
