import { useEffect } from "react";
import { Header } from "@/components/Header";
import { MainLayout } from "@/components/MainLayout";
import { DropZone } from "@/components/DropZone";
import { ExportDialog } from "@/components/ExportDialog";
import { PreviewModal } from "@/components/PreviewModal";
import { ToastContainer } from "@/components/ToastContainer";
import { ContextMenuProvider } from "@/components/ContextMenu";
import { OnboardingOverlay } from "@/components/OnboardingOverlay";
import { usePdfRenderer } from "@/hooks/usePdfRenderer";
import { usePdfStore } from "@/store/usePdfStore";

function applyTheme(theme: "light" | "dark" | "system") {
  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
}

export default function App() {
  const fileName = usePdfStore((state) => state.fileName);
  const theme = usePdfStore((state) => state.theme);
  const { documentProxy } = usePdfRenderer();

  useEffect(() => {
    applyTheme(theme);

    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyTheme("system");
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [theme]);

  return (
    <ContextMenuProvider>
      <div className="min-h-screen overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(91,141,239,0.18),_transparent_30%),linear-gradient(180deg,_#f0ece2_0%,_#e5edf4_42%,_#d7e2ea_100%)] text-ink dark:bg-[radial-gradient(circle_at_top,_rgba(91,141,239,0.1),_transparent_30%),linear-gradient(180deg,_#0b1018_0%,_#121c28_42%,_#182230_100%)] dark:text-ink-light">
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
        </div>
        <ToastContainer />
        <OnboardingOverlay />
      </div>
    </ContextMenuProvider>
  );
}
