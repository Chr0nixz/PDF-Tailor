import { PageSidebar } from "@/components/PageSidebar";
import { Workspace } from "@/components/Workspace";
import { PropertiesPanel } from "@/components/PropertiesPanel";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

export function MainLayout() {
  useKeyboardShortcuts();

  return (
    <main className="mt-5 grid flex-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)_320px]">
      <PageSidebar />
      <Workspace />
      <PropertiesPanel />
    </main>
  );
}
