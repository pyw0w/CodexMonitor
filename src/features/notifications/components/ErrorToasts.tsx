import type { ErrorToast } from "../../../services/toasts";
import { useI18n } from "@/i18n/useI18n";
import {
  ToastBody,
  ToastCard,
  ToastHeader,
  ToastTitle,
  ToastViewport,
} from "../../design-system/components/toast/ToastPrimitives";

type ErrorToastsProps = {
  toasts: ErrorToast[];
  onDismiss: (id: string) => void;
};

export function ErrorToasts({ toasts, onDismiss }: ErrorToastsProps) {
  const { t } = useI18n();
  if (!toasts.length) {
    return null;
  }

  return (
    <ToastViewport className="error-toasts" role="region" ariaLive="assertive">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} className="error-toast" role="alert">
          <ToastHeader className="error-toast-header">
            <ToastTitle className="error-toast-title">{toast.title}</ToastTitle>
            <button
              type="button"
              className="ghost error-toast-dismiss"
              onClick={() => onDismiss(toast.id)}
              aria-label={t("errors.toast.dismissAria")}
              title={t("errors.toast.dismiss")}
            >
              ×
            </button>
          </ToastHeader>
          <ToastBody className="error-toast-body">{toast.message}</ToastBody>
          {toast.details ? (
            <details className="error-toast-details">
              <summary>{t("errors.toast.details")}</summary>
              <pre className="error-toast-details-text">{toast.details}</pre>
            </details>
          ) : null}
        </ToastCard>
      ))}
    </ToastViewport>
  );
}
