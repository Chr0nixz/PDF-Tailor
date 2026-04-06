import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ContextMenuTarget } from "@/hooks/useContextMenu";

export type ContextMenuItem =
  | { divider: true }
  | {
      divider?: false;
      label: string;
      shortcut?: string;
      disabled?: boolean;
      danger?: boolean;
      action: () => void;
    };

type NonDividerItem = Extract<ContextMenuItem, { divider?: false }>;

interface ContextMenuContextValue {
  open: (e: React.MouseEvent, target: ContextMenuTarget, items: ContextMenuItem[]) => void;
  close: () => void;
}

const ContextMenuContext = createContext<ContextMenuContextValue | null>(null);

export function useContextMenu() {
  const ctx = useContext(ContextMenuContext);
  if (!ctx) {
    throw new Error("useContextMenu must be used inside ContextMenuProvider");
  }
  return ctx;
}

interface ContextMenuState {
  isOpen: boolean;
  position: { x: number; y: number };
  target: ContextMenuTarget | null;
  items: ContextMenuItem[];
}

const MENU_WIDTH = 220;
const MENU_ITEM_HEIGHT = 38;

export function ContextMenuProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ContextMenuState>({
    isOpen: false,
    position: { x: 0, y: 0 },
    target: null,
    items: [],
  });

  const open = useCallback(
    (e: React.MouseEvent, target: ContextMenuTarget, items: ContextMenuItem[]) => {
      e.preventDefault();
      e.stopPropagation();
      setState({
        isOpen: true,
        position: { x: e.clientX, y: e.clientY },
        target,
        items,
      });
    },
    [],
  );

  const close = useCallback(() => {
    setState((s) => ({ ...s, isOpen: false }));
  }, []);

  const adjustedPosition = useRef({ x: 0, y: 0 });
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Recalculate position when menu opens or position changes
  useEffect(() => {
    if (!state.isOpen) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const visibleItems = state.items.filter((i): i is NonDividerItem => !i.divider);
    const menuHeight = MENU_ITEM_HEIGHT * visibleItems.length;

    let x = state.position.x;
    let y = state.position.y;

    if (x + MENU_WIDTH > vw - 8) x = vw - MENU_WIDTH - 8;
    if (y + menuHeight > vh - 8) y = vh - menuHeight - 8;
    if (y < 8) y = 8;

    adjustedPosition.current = { x, y };
    setSelectedIndex(0);
  }, [state.isOpen, state.position, state.items]);

  // Keyboard + escape handler
  useEffect(() => {
    if (!state.isOpen) return;

    const actionableItems = state.items.filter((i): i is NonDividerItem => !i.divider);

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % actionableItems.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + actionableItems.length) % actionableItems.length);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const item = actionableItems[selectedIndex];
        if (item && !item.disabled) {
          item.action();
          close();
        }
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [state.isOpen, state.items, selectedIndex, close]);

  // Click outside to close
  useEffect(() => {
    if (!state.isOpen) return;
    const timer = setTimeout(() => document.addEventListener("click", close, { once: true }), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", close);
    };
  }, [state.isOpen, close]);

  const menuElement =
    state.isOpen && state.target ? (
      <div
        role="menu"
        aria-orientation="vertical"
        style={{
          position: "fixed",
          left: `${adjustedPosition.current.x}px`,
          top: `${adjustedPosition.current.y}px`,
          width: `${MENU_WIDTH}px`,
          zIndex: 9999,
        }}
        className="rounded-[14px] border border-ink/12 bg-white/95 py-1.5 shadow-xl backdrop-blur-sm dark:border-white/12 dark:bg-ink-light/95"
        onClick={(e) => e.stopPropagation()}
      >
        {(() => {
          const actionableItems = state.items.filter((f): f is NonDividerItem => !f.divider);
          return state.items.map((item, index) => {
            if (item.divider) {
              return (
                <div
                  key={`divider-${index}`}
                  className="my-1 border-t border-ink/8 dark:border-white/8"
                />
              );
            }

            const itemGlobalIndex = actionableItems.indexOf(item);
            const isSelected = itemGlobalIndex === selectedIndex && !item.disabled;

          return (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                if (!item.disabled) {
                  item.action();
                  close();
                }
              }}
              className={`flex w-full items-center justify-between px-4 py-2 text-sm transition-colors ${
                item.disabled
                  ? "cursor-not-allowed text-ink/35 dark:text-ink-light/35"
                  : item.danger
                    ? "text-ember dark:text-ember-dark"
                    : "text-ink dark:text-ink-light"
              } ${isSelected ? "bg-ink/8 dark:bg-white/10" : ""}`}
            >
              <span>{item.label}</span>
              {item.shortcut ? (
                <span className="ml-4 text-xs text-ink/40 dark:text-ink-light/40">
                  {item.shortcut}
                </span>
              ) : null}
            </button>
          );
          });
        })()}
      </div>
    ) : null;

  return (
    <ContextMenuContext.Provider value={{ open, close }}>
      {children}
      {createPortal(menuElement, document.body)}
    </ContextMenuContext.Provider>
  );
}
