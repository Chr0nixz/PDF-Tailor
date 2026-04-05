import { PdfPageCanvas } from "@/components/PdfPageCanvas";
import { usePdfStore } from "@/store/usePdfStore";
import type { PDFDocumentProxy } from "@/lib/pdfjs";

interface WorkspaceProps {
  documentProxy: PDFDocumentProxy | null;
}

export function Workspace({ documentProxy }: WorkspaceProps) {
  const currentPageIndex = usePdfStore((state) => state.currentPageIndex);
  const pages = usePdfStore((state) => state.pages);
  const zoom = usePdfStore((state) => state.zoom);
  const documentLoadState = usePdfStore((state) => state.documentLoadState);
  const documentLoadProgress = usePdfStore((state) => state.documentLoadProgress);
  const page = pages[currentPageIndex];

  return (
    <section className="panel-surface flex min-h-[520px] flex-col overflow-hidden p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-ink/55">Workspace</div>
          <div className="mt-1 text-lg font-semibold">Current page canvas</div>
        </div>
        <div className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-ink/60">
          Zoom {Math.round(zoom * 100)}%
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center rounded-[28px] border border-dashed border-ink/10 bg-[linear-gradient(180deg,_rgba(255,253,248,0.8)_0%,_rgba(230,238,245,0.8)_100%)] p-6">
        <div className="relative flex min-h-[460px] w-full items-center justify-center overflow-auto rounded-[24px] bg-[#dbe3ea] p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(91,141,239,0.12),_transparent_32%),radial-gradient(circle_at_bottom,_rgba(184,92,56,0.08),_transparent_24%)]" />
          {documentLoadState === "loading" ? (
            <div className="relative rounded-[18px] bg-white/75 px-6 py-4 text-center text-sm text-ink/70">
              Loading PDF...
              {documentLoadProgress !== null ? (
                <div className="mt-2 font-medium">
                  {Number.isFinite(documentLoadProgress)
                    ? `${Math.round(documentLoadProgress)}%`
                    : "Preparing pages"}
                </div>
              ) : null}
            </div>
          ) : null}
          {documentLoadState === "ready" && documentProxy && page ? (
            <div className="relative z-10">
              <PdfPageCanvas
                documentProxy={documentProxy}
                pageIndex={currentPageIndex}
                zoom={zoom}
              />
              <div className="absolute right-5 top-5 rounded-full bg-ink px-3 py-1 text-xs font-medium text-white">
                Page {currentPageIndex + 1}
              </div>
            </div>
          ) : null}
          {documentLoadState !== "loading" && (!documentProxy || !page) ? (
            <div className="relative rounded-[18px] bg-white/75 px-6 py-4 text-sm text-ink/60">
              Open a PDF to render the current page here.
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
