import { create } from "zustand";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

interface ToastStoreState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id" | "duration"> & { duration?: number }) => void;
  removeToast: (id: string) => void;
}

const MAX_TOASTS = 5;
const DEFAULT_DURATIONS: Record<ToastType, number> = {
  success: 4000,
  info: 4000,
  warning: 5000,
  error: 6000,
};

function createToastId() {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useToastStore = create<ToastStoreState>((set) => ({
  toasts: [],
  addToast: ({ type, message, duration }) =>
    set((state) => {
      const nextToasts =
        state.toasts.length >= MAX_TOASTS
          ? state.toasts.slice(1)
          : state.toasts;

      return {
        toasts: [
          ...nextToasts,
          {
            id: createToastId(),
            type,
            message,
            duration: duration ?? DEFAULT_DURATIONS[type],
          },
        ],
      };
    }),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
}));
