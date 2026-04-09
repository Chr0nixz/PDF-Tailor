import { useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { PageSidebar } from "@/components/PageSidebar";
import { Workspace } from "@/components/Workspace";
import { PropertiesPanel } from "@/components/PropertiesPanel";
import { ResizeHandle } from "@/components/ResizeHandle";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { usePdfStore } from "@/store/usePdfStore";
import type { PDFDocumentProxy } from "@/lib/pdfjs";

interface MainLayoutProps {
  documentProxy: PDFDocumentProxy | null;
}

const TABS = ["pages", "workspace", "properties"] as const;
type TabId = (typeof TABS)[number];

export function MainLayout({ documentProxy }: MainLayoutProps) {
  const { t } = useTranslation();
  useKeyboardShortcuts();
  const [mobileTab, setMobileTab] = useState<TabId>("workspace");

  const sidebarWidth = usePdfStore((s) => s.sidebarWidth);
  const propertiesPanelWidth = usePdfStore((s) => s.propertiesPanelWidth);
  const sidebarCollapsed = usePdfStore((s) => s.sidebarCollapsed);
  const propertiesPanelCollapsed = usePdfStore((s) => s.propertiesPanelCollapsed);
  const setSidebarWidth = usePdfStore((s) => s.setSidebarWidth);
  const setPropertiesPanelWidth = usePdfStore((s) => s.setPropertiesPanelWidth);
  const setSidebarCollapsed = usePdfStore((s) => s.setSidebarCollapsed);
  const setPropertiesPanelCollapsed = usePdfStore((s) => s.setPropertiesPanelCollapsed);

  // Use refs to track widths during drag to avoid stale closure issues
  const sidebarWidthRef = useRef(sidebarWidth);
  const propertiesPanelWidthRef = useRef(propertiesPanelWidth);

  // Keep refs in sync with store
  sidebarWidthRef.current = sidebarWidth;
  propertiesPanelWidthRef.current = propertiesPanelWidth;

  const handleSidebarResize = useCallback((delta: number) => {
    setSidebarWidth(sidebarWidthRef.current + delta);
  }, [setSidebarWidth]);

  const handlePropertiesResize = useCallback((delta: number) => {
    setPropertiesPanelWidth(propertiesPanelWidthRef.current + delta);
  }, [setPropertiesPanelWidth]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      const currentIndex = TABS.indexOf(mobileTab);
      const nextIndex =
        event.key === "ArrowRight"
          ? (currentIndex + 1) % TABS.length
          : (currentIndex - 1 + TABS.length) % TABS.length;
      setMobileTab(TABS[nextIndex]);
    }
  }, [mobileTab]);

  return (
    <main
      className="mt-5 flex flex-col gap-4 lg:flex-row"
      onKeyDown={handleKeyDown}
    >
      <div
        role="tablist"
        aria-label="Navigation"
        className="panel-surface flex items-center gap-2 px-3 py-3 lg:hidden"
      >
        {[
          { id: "pages", label: t("sidebar.title") },
          { id: "workspace", label: t("workspace.title") },
          { id: "properties", label: t("properties.title") },
        ].map((tab) => {
          const active = mobileTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={active}
              onClick={() => setMobileTab(tab.id as TabId)}
              className={`flex-1 rounded-full px-4 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-ink text-white dark:bg-ink-light dark:text-mist-dark"
                  : "border border-ink/10 bg-white/80 text-ink hover:border-ink/20 dark:border-white/10 dark:bg-white/5 dark:text-ink-light dark:hover:border-white/20"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Sidebar */}
      {sidebarCollapsed ? (
        <button
          type="button"
          onClick={() => setSidebarCollapsed(false)}
          className="panel-surface fixed left-0 top-1/2 z-10 hidden -translate-y-1/2 flex-col items-center gap-2 rounded-r-xl px-2 py-4 lg:flex"
          title={t("sidebar.expand")}
        >
          <span className="writing-mode-vertical text-xs tracking-widest text-ink/60 dark:text-ink-light/60">
            {t("sidebar.title")}
          </span>
          <span className="text-lg">→</span>
        </button>
      ) : (
        <>
          <div
            role="tabpanel"
            id="panel-pages"
            aria-labelledby="tab-pages"
            className={`min-h-0 lg:block ${mobileTab === "pages" ? "block" : "hidden"}`}
            style={{ width: sidebarWidth }}
          >
            <PageSidebar documentProxy={documentProxy} />
          </div>
          <ResizeHandle direction="right" onResize={handleSidebarResize} />
        </>
      )}

      {/* Workspace */}
      <div
        role="tabpanel"
        id="panel-workspace"
        aria-labelledby="tab-workspace"
        className={`min-h-0 flex-1 lg:block ${mobileTab === "workspace" ? "block" : "hidden"}`}
      >
        <Workspace documentProxy={documentProxy} />
      </div>

      {/* Properties */}
      {propertiesPanelCollapsed ? (
        <button
          type="button"
          onClick={() => setPropertiesPanelCollapsed(false)}
          className="panel-surface fixed right-0 top-1/2 z-10 hidden -translate-y-1/2 flex-col items-center gap-2 rounded-l-xl px-2 py-4 lg:flex"
          title={t("properties.expand")}
        >
          <span className="writing-mode-vertical text-xs tracking-widest text-ink/60 dark:text-ink-light/60">
            {t("properties.title")}
          </span>
          <span className="text-lg">←</span>
        </button>
      ) : (
        <>
          <ResizeHandle direction="left" onResize={handlePropertiesResize} />
          <div
            role="tabpanel"
            id="panel-properties"
            aria-labelledby="tab-properties"
            className={`min-h-0 lg:block ${mobileTab === "properties" ? "block" : "hidden"}`}
            style={{ width: propertiesPanelWidth }}
          >
            <PropertiesPanel documentProxy={documentProxy} />
          </div>
        </>
      )}
    </main>
  );
}
