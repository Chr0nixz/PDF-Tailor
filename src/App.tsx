import { Header } from "@/components/Header";
import { MainLayout } from "@/components/MainLayout";
import { DropZone } from "@/components/DropZone";
import { usePdfRenderer } from "@/hooks/usePdfRenderer";
import { usePdfStore } from "@/store/usePdfStore";

export default function App() {
  const fileName = usePdfStore((state) => state.fileName);
  const errorMessage = usePdfStore((state) => state.errorMessage);
  const { documentProxy } = usePdfRenderer();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(91,141,239,0.18),_transparent_30%),linear-gradient(180deg,_#f0ece2_0%,_#e5edf4_42%,_#d7e2ea_100%)] text-ink">
      <div className="mx-auto flex min-h-screen max-w-[1680px] flex-col px-4 py-4 md:px-6">
        <Header />
        {errorMessage ? (
          <div className="mt-4 rounded-[22px] border border-ember/20 bg-ember/10 px-4 py-3 text-sm text-ember">
            {errorMessage}
          </div>
        ) : null}
        {fileName ? <MainLayout documentProxy={documentProxy} /> : <DropZone />}
      </div>
    </div>
  );
}
