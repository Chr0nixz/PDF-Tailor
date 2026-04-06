import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { PageSidebar } from "@/components/PageSidebar";
import { Workspace } from "@/components/Workspace";
import { PropertiesPanel } from "@/components/PropertiesPanel";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
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
    <main className="mt-5 flex flex-col gap-4 lg:grid lg:min-h-[var(--panel-viewport-h)] lg:grid-cols-[280px_minmax(0,1fr)_320px]">
      <div
        role="tablist"
        aria-label="Navigation"
        className="panel-surface flex items-center gap-2 px-3 py-3 lg:hidden"
        onKeyDown={handleKeyDown}
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
      <div
        role="tabpanel"
        id={`panel-${mobileTab}`}
        aria-labelledby={`tab-${mobileTab}`}
        className={`min-h-0 ${mobileTab === "pages" ? "block" : "hidden"} lg:block`}
      >
        <PageSidebar documentProxy={documentProxy} />
      </div>
      <div
        role="tabpanel"
        id={`panel-${mobileTab}`}
        aria-labelledby={`tab-${mobileTab}`}
        className={`min-h-0 ${mobileTab === "workspace" ? "block" : "hidden"} lg:block`}
      >
        <Workspace documentProxy={documentProxy} />
      </div>
      <div
        role="tabpanel"
        id={`panel-${mobileTab}`}
        aria-labelledby={`tab-${mobileTab}`}
        className={`min-h-0 ${mobileTab === "properties" ? "block" : "hidden"} lg:block`}
      >
        <PropertiesPanel />
      </div>
    </main>
  );
}
