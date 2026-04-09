import { useEffect } from "react";
import { Header } from "@/components/Header";
import { MainLayout } from "@/components/MainLayout";
import { DropZone } from "@/components/DropZone";
import { ExportDialog } from "@/components/ExportDialog";
import { PreviewModal } from "@/components/PreviewModal";
import { PrintPreview } from "@/components/PrintPreview";
import { ToastContainer } from "@/components/ToastContainer";
import { ContextMenuProvider } from "@/components/ContextMenu";
import { OnboardingOverlay } from "@/components/OnboardingOverlay";
import { ShortcutSettings } from "@/components/ShortcutSettings";
import { ThemeSelector } from "@/components/ThemeSelector";
import { usePdfRenderer } from "@/hooks/usePdfRenderer";
import { usePdfStore } from "@/store/usePdfStore";
import type { ThemeName } from "@/types";

// Dark theme names
const DARK_THEMES: Record<ThemeName, boolean> = {
  midnight: true,
  paper: false,
  warm: false,
  "high-contrast": false,
};

function applyTheme(themeName: ThemeName) {
  const isDark = DARK_THEMES[themeName] ?? false;
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.setAttribute("data-theme", themeName);
}

export default function App() {
  const fileName = usePdfStore((state) => state.fileName);
  const themeName = usePdfStore((state) => state.themeName);
  const shortcutSettingsOpen = usePdfStore((state) => state.shortcutSettingsOpen);
  const setShortcutSettingsOpen = usePdfStore((state) => state.setShortcutSettingsOpen);
  const { documentProxy } = usePdfRenderer();

  useEffect(() => {
    applyTheme(themeName);
  }, [themeName]);

  return (
    <ContextMenuProvider>
      <div className="min-h-screen overflow-y-auto bg-[linear-gradient(180deg,_#f0ece2_0%,_#e5edf4_42%,_#d7e2ea_100%)] text-ink dark:bg-[linear-gradient(180deg,_#0b1018_0%,_#121c28_42%,_#182230_100%)] dark:text-ink-light">
        <a
          href="#workspace-viewport"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg"
        >
          Skip to workspace
        </a>
        <div className="mx-auto flex min-h-screen max-w-[1680px] flex-col px-4 py-4 md:px-6">
          <Header />
          {fileName ? <MainLayout documentProxy={documentProxy} /> : <DropZone />}
          <ExportDialog />
          <PreviewModal />
          <PrintPreview documentProxy={documentProxy} />
        </div>
        <ToastContainer />
        <OnboardingOverlay />
        <ShortcutSettings
          open={shortcutSettingsOpen}
          onClose={() => setShortcutSettingsOpen(false)}
        />
      </div>
    </ContextMenuProvider>
  );
}
