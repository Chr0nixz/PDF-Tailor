export function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

export async function readFileAsUint8Array(file: File) {
  const fileBuffer = await file.arrayBuffer();
  return new Uint8Array(fileBuffer);
}

// Tauri-specific file operations
// These functions are only functional when running inside the Tauri desktop shell.
// They provide native file dialogs and filesystem access.

let tauriPluginsAvailable: boolean | null = null;

async function checkTauriAvailable(): Promise<boolean> {
  if (tauriPluginsAvailable !== null) return tauriPluginsAvailable;
  try {
    const { open, save } = await import("@tauri-apps/plugin-dialog");
    void open; void save;
    tauriPluginsAvailable = true;
  } catch {
    tauriPluginsAvailable = false;
  }
  return tauriPluginsAvailable;
}

export function isTauriAvailable() {
  // Synchronous check - returns last known state or false if never checked
  return tauriPluginsAvailable === true;
}

export async function openPdfDialog(): Promise<{ path: string; buffer: Uint8Array; name: string } | null> {
  if (!(await checkTauriAvailable())) return null;
  try {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const { readFile } = await import("@tauri-apps/plugin-fs");

    const result = await open({
      multiple: false,
      filters: [{ name: "PDF", extensions: ["pdf"] }],
      title: "Open PDF",
    });

    if (!result || typeof result !== "string") return null;

    const filePath = result;
    const fileName = filePath.split(/[/\\]/).pop() ?? "unknown.pdf";
    const fileBuffer = await readFile(filePath);

    return { path: filePath, buffer: fileBuffer, name: fileName };
  } catch {
    return null;
  }
}

export async function savePdfDialog(
  defaultName: string,
): Promise<string | null> {
  if (!(await checkTauriAvailable())) return null;
  try {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const result = await save({
      defaultPath: defaultName,
      filters: [{ name: "PDF", extensions: ["pdf"] }],
      title: "Save PDF",
    });
    return result;
  } catch {
    return null;
  }
}

export async function writeFileFromUint8Array(
  path: string,
  data: Uint8Array,
): Promise<void> {
  if (!(await checkTauriAvailable())) return;
  const { writeFile } = await import("@tauri-apps/plugin-fs");
  await writeFile(path, data);
}

export async function openFileLocation(filePath: string): Promise<void> {
  if (!(await checkTauriAvailable())) return;
  try {
    const { open: shellOpen } = await import("@tauri-apps/plugin-shell");
    const dirPath = filePath.replace(/[/\\][^/\\]+$/, "");
    await shellOpen(dirPath);
  } catch {
    // Silently fail if shell open is not available
  }
}
