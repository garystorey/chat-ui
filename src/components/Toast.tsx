import "./Toast.css";

export type ToastType = "success" | "error" | "warning" | "info";

export type ToastItem = {
  id: string;
  message: string;
  type: ToastType;
  title?: string;
};

type ToastStackProps = {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
};

const toastLabelMap: Record<ToastType, string> = {
  success: "Success",
  error: "Error",
  warning: "Warning",
  info: "Info",
};

const ToastStack = ({ toasts, onDismiss }: ToastStackProps) => (
  <div className="toast-stack" role="region" aria-live="polite" aria-label="Notifications">
    {toasts.map((toast) => (
      <div
        key={toast.id}
        className={`toast toast--${toast.type}`}
        role={toast.type === "error" ? "alert" : "status"}
        aria-label={toastLabelMap[toast.type]}
      >
        <div className="toast__body">
          {toast.title ? <span className="toast__title">{toast.title}</span> : null}
          <span className="toast__message">{toast.message}</span>
        </div>
        <button
          type="button"
          className="toast__dismiss"
          onClick={() => onDismiss(toast.id)}
          aria-label={`Dismiss ${toastLabelMap[toast.type]} notification`}
        >
          ×
        </button>
      </div>
    ))}
  </div>
);

export default ToastStack;
