export type ShortcutAction =
  | "undo"
  | "redo"
  | "export"
  | "copyCrop"
  | "pasteCrop"
  | "selectAll"
  | "applyCrop"
  | "zoomReset"
  | "zoomIn"
  | "zoomOut"
  | "clearCrop"
  | "prevPage"
  | "nextPage"
  | "togglePreview"
  | "nudgeUp"
  | "nudgeDown"
  | "nudgeLeft"
  | "nudgeRight"
  | "restoreOrder";

export type KeyBinding = {
  id: ShortcutAction;
  key: string;
  modifiers?: ("ctrl" | "shift" | "alt" | "meta")[];
  description: string;
};

export const DEFAULT_BINDINGS: KeyBinding[] = [
  { id: "undo", key: "z", modifiers: ["ctrl"], description: "shortcuts.undo" },
  { id: "redo", key: "y", modifiers: ["ctrl"], description: "shortcuts.redo" },
  { id: "redo", key: "z", modifiers: ["ctrl", "shift"], description: "shortcuts.redo" },
  { id: "export", key: "s", modifiers: ["ctrl"], description: "shortcuts.export" },
  { id: "copyCrop", key: "c", modifiers: ["ctrl"], description: "shortcuts.copyCrop" },
  { id: "pasteCrop", key: "v", modifiers: ["ctrl"], description: "shortcuts.pasteCrop" },
  { id: "selectAll", key: "a", modifiers: ["ctrl"], description: "shortcuts.selectAll" },
  { id: "applyCrop", key: "Enter", modifiers: ["ctrl"], description: "shortcuts.applyCrop" },
  { id: "zoomReset", key: "0", modifiers: ["ctrl"], description: "shortcuts.zoomReset" },
  { id: "zoomIn", key: "=", modifiers: ["ctrl"], description: "shortcuts.zoomIn" },
  { id: "zoomOut", key: "-", modifiers: ["ctrl"], description: "shortcuts.zoomOut" },
  { id: "clearCrop", key: "Delete", modifiers: [], description: "shortcuts.clearCrop" },
  { id: "prevPage", key: "PageUp", modifiers: [], description: "shortcuts.prevPage" },
  { id: "nextPage", key: "PageDown", modifiers: [], description: "shortcuts.nextPage" },
  { id: "prevPage", key: "Tab", modifiers: ["shift"], description: "shortcuts.prevPage" },
  { id: "nextPage", key: "Tab", modifiers: [], description: "shortcuts.nextPage" },
  { id: "togglePreview", key: " ", modifiers: [], description: "shortcuts.togglePreview" },
  { id: "nudgeUp", key: "ArrowUp", modifiers: [], description: "shortcuts.nudgeUp" },
  { id: "nudgeDown", key: "ArrowDown", modifiers: [], description: "shortcuts.nudgeDown" },
  { id: "nudgeLeft", key: "ArrowLeft", modifiers: [], description: "shortcuts.nudgeLeft" },
  { id: "nudgeRight", key: "ArrowRight", modifiers: [], description: "shortcuts.nudgeRight" },
  { id: "restoreOrder", key: "r", modifiers: ["ctrl", "shift"], description: "shortcuts.restoreOrder" },
];

export function parseKeyEvent(event: KeyboardEvent): { key: string; modifiers: string[] } {
  const modifiers: string[] = [];
  if (event.ctrlKey) modifiers.push("ctrl");
  if (event.shiftKey) modifiers.push("shift");
  if (event.altKey) modifiers.push("alt");
  if (event.metaKey) modifiers.push("meta");
  return { key: event.key, modifiers };
}

export function bindingsEqual(a: KeyBinding, b: KeyBinding): boolean {
  if (a.key !== b.key) return false;
  const aMods = a.modifiers ?? [];
  const bMods = b.modifiers ?? [];
  if (aMods.length !== bMods.length) return false;
  return aMods.every((m) => bMods.includes(m));
}
