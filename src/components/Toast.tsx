import { ToastItem, ToastType } from "../types";
import "./Toast.css";

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
  <div
    className="toast-stack"
    role="region"
    aria-live="polite"
    aria-label="Notifications"
  >
    {toasts.map((toast) => (
      <div
        key={toast.id}
        className={`toast toast--${toast.type}`}
        role={toast.type === "error" ? "alert" : "status"}
        aria-label={toastLabelMap[toast.type]}
      >
        <div className="toast__body">
          <span className="toast__message">{toast.message}</span>
        </div>
        <button
          type="button"
          className="toast__dismiss"
          onClick={() => onDismiss(toast.id)}
          aria-label={`Dismiss ${toastLabelMap[toast.type]} notification`}
        >
          &times;
        </button>
      </div>
    ))}
  </div>
);

export default ToastStack;
