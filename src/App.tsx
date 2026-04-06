import { Header } from "@/components/Header";
import { MainLayout } from "@/components/MainLayout";
import { DropZone } from "@/components/DropZone";
import { ExportDialog } from "@/components/ExportDialog";
import { PreviewModal } from "@/components/PreviewModal";
import { usePdfRenderer } from "@/hooks/usePdfRenderer";
import { usePdfStore } from "@/store/usePdfStore";

export default function App() {
  const fileName = usePdfStore((state) => state.fileName);
  const errorMessage = usePdfStore((state) => state.errorMessage);
  const setErrorMessage = usePdfStore((state) => state.setErrorMessage);
  const { documentProxy } = usePdfRenderer();

  return (
    <div className="h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(91,141,239,0.18),_transparent_30%),linear-gradient(180deg,_#f0ece2_0%,_#e5edf4_42%,_#d7e2ea_100%)] text-ink">
      <div className="mx-auto flex h-screen max-w-[1680px] flex-col overflow-hidden px-4 py-4 md:px-6">
        <Header />
        {errorMessage ? (
          <div className="mt-4 flex items-start justify-between gap-4 rounded-[22px] border border-ember/20 bg-ember/10 px-4 py-3 text-sm text-ember">
            <div>{errorMessage}</div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="rounded-full border border-ember/20 bg-white/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-ember transition hover:border-ember/35"
            >
              Dismiss
            </button>
          </div>
        ) : null}
        {fileName ? <MainLayout documentProxy={documentProxy} /> : <DropZone />}
        <ExportDialog />
        <PreviewModal />
      </div>
    </div>
  );
}
