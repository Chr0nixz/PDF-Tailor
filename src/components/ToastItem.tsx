import { useEffect, useState } from "react";
import type { Toast, ToastType } from "@/store/useToastStore";

const typeStyles: Record<ToastType, string> = {
  success: "border-pine/30 bg-pine/10 text-pine",
  error: "border-ember/30 bg-ember/10 text-ember",
  info: "border-sky/30 bg-sky/10 text-sky",
  warning: "border-amber-500/30 bg-amber-100/70 text-amber-900",
};

const typeIcons: Record<ToastType, string> = {
  success: "\u2713",
  error: "\u2717",
  info: "\u2139",
  warning: "\u26A0",
};

export function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(onDismiss, 300);
    }, toast.duration);

    return () => clearTimeout(timer);
  }, [toast.duration, onDismiss]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`flex items-start gap-3 rounded-[18px] border px-4 py-3 text-sm shadow-panel backdrop-blur transition-all duration-300 ${
        typeStyles[toast.type]
      } ${exiting ? "translate-x-4 opacity-0" : "translate-x-0 opacity-100"}`}
    >
      <span className="mt-0.5 text-base leading-none">{typeIcons[toast.type]}</span>
      <div className="flex-1 leading-6">{toast.message}</div>
      <button
        type="button"
        onClick={() => {
          setExiting(true);
          setTimeout(onDismiss, 300);
        }}
        className="shrink-0 rounded-full px-1.5 py-0.5 text-xs font-medium uppercase tracking-[0.12em] opacity-60 transition hover:opacity-100"
      >
        \u2715
      </button>
    </div>
  );
}
