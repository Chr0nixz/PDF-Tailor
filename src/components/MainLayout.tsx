import { useState } from "react";
import { PageSidebar } from "@/components/PageSidebar";
import { Workspace } from "@/components/Workspace";
import { PropertiesPanel } from "@/components/PropertiesPanel";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import type { PDFDocumentProxy } from "@/lib/pdfjs";

interface MainLayoutProps {
  documentProxy: PDFDocumentProxy | null;
}

export function MainLayout({ documentProxy }: MainLayoutProps) {
  useKeyboardShortcuts();
  const [mobileTab, setMobileTab] = useState<"pages" | "workspace" | "properties">(
    "workspace",
  );

  return (
    <main className="mt-5 flex min-h-0 flex-1 flex-col gap-4 overflow-hidden lg:grid lg:grid-cols-[280px_minmax(0,1fr)_320px]">
      <div className="panel-surface flex items-center gap-2 px-3 py-3 lg:hidden">
        {[
          { id: "pages", label: "页面" },
          { id: "workspace", label: "画布" },
          { id: "properties", label: "参数" },
        ].map((tab) => {
          const active = mobileTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setMobileTab(tab.id as typeof mobileTab)}
              className={`flex-1 rounded-full px-4 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-ink text-white"
                  : "border border-ink/10 bg-white/80 text-ink hover:border-ink/20"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div className={`min-h-0 ${mobileTab === "pages" ? "block" : "hidden"} lg:block`}>
        <PageSidebar documentProxy={documentProxy} />
      </div>
      <div className={`min-h-0 ${mobileTab === "workspace" ? "block" : "hidden"} lg:block`}>
        <Workspace documentProxy={documentProxy} />
      </div>
      <div className={`min-h-0 ${mobileTab === "properties" ? "block" : "hidden"} lg:block`}>
        <PropertiesPanel />
      </div>
    </main>
  );
}
