import { createPortal } from "react-dom";
import { useToastStore } from "@/store/useToastStore";
import { ToastItem } from "@/components/ToastItem";

export function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  if (toasts.length === 0) {
    return null;
  }

  return createPortal(
    <div aria-live="assertive" className="fixed bottom-6 right-6 z-[100] flex w-80 flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={() => removeToast(toast.id)}
        />
      ))}
    </div>,
    document.body,
  );
}
