import { useCallback, useEffect, useRef, useState } from "react";

export type ContextMenuTarget =
  | { type: "thumbnail"; pageIndex: number }
  | { type: "workspace" }
  | { type: "properties" };

export interface ContextMenuState {
  isOpen: boolean;
  position: { x: number; y: number };
  target: ContextMenuTarget | null;
}

export function useContextMenu() {
  const [state, setState] = useState<ContextMenuState>({
    isOpen: false,
    position: { x: 0, y: 0 },
    target: null,
  });
  const menuRef = useRef<HTMLDivElement | null>(null);

  const open = useCallback((e: MouseEvent | React.MouseEvent, target: ContextMenuTarget) => {
    e.preventDefault();
    e.stopPropagation();
    setState({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
      target,
    });
  }, []);

  const close = useCallback(() => {
    setState((s) => ({ ...s, isOpen: false }));
  }, []);

  useEffect(() => {
    if (!state.isOpen) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [state.isOpen, close]);

  return { state, menuRef, open, close };
}
