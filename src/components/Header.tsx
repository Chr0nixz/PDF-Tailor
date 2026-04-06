import { useRef, type ChangeEvent } from "react";
import { usePdfStore } from "@/store/usePdfStore";
import { getRotatedPages, isLargeDocument } from "@/utils/documentWarnings";
import { isPdfFile, readFileAsUint8Array } from "@/utils/fileIO";

function ZoomButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-ink/10 bg-white/70 px-3 py-1.5 text-sm font-medium text-ink transition hover:border-ink/25"
    >
      {label}
    </button>
  );
}

export function Header() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fileName = usePdfStore((state) => state.fileName);
  const zoom = usePdfStore((state) => state.zoom);
  const pageCount = usePdfStore((state) => state.pageCount);
  const file = usePdfStore((state) => state.file);
  const pages = usePdfStore((state) => state.pages);
  const documentLoadState = usePdfStore((state) => state.documentLoadState);
  const previewOpen = usePdfStore((state) => state.previewOpen);
  const exportInProgress = usePdfStore((state) => state.exportInProgress);
  const setZoom = usePdfStore((state) => state.setZoom);
  const setDocument = usePdfStore((state) => state.setDocument);
  const setPreviewOpen = usePdfStore((state) => state.setPreviewOpen);
  const setExportDialogOpen = usePdfStore((state) => state.setExportDialogOpen);
  const setErrorMessage = usePdfStore((state) => state.setErrorMessage);
  const clearDocument = usePdfStore((state) => state.clearDocument);
  const rotatedPages = getRotatedPages(pages);
  const largeDocument = isLargeDocument(pageCount, file?.size);

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";

    if (!file) {
      return;
    }

    if (!isPdfFile(file)) {
      setErrorMessage("Please choose a PDF file.");
      return;
    }

    try {
      const fileBuffer = await readFileAsUint8Array(file);
      setDocument({
        file,
        fileBuffer,
        fileName: file.name,
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to read the selected file.",
      );
    }
  };

  return (
    <header className="panel-surface flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between md:px-6">
      <div className="flex items-center gap-4">
        <div className="rounded-[20px] bg-ink px-4 py-3 text-white">
          <div className="text-xs uppercase tracking-[0.24em] text-white/60">PDF-Tailor</div>
          <div className="mt-1 text-lg font-semibold">v1.0</div>
        </div>
        <div>
          <div className="text-sm font-medium text-ink/55">Current document</div>
          <div className="mt-1 text-base font-semibold">
            {fileName ?? "No PDF loaded"}
          </div>
          <div className="text-sm text-ink/55">
            {documentLoadState === "loading"
              ? "Loading PDF..."
              : pageCount > 0
                ? `${pageCount} pages loaded`
                : "Choose a local PDF to begin"}
          </div>
          {fileName ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {rotatedPages.length > 0 ? (
                <div className="rounded-full border border-amber-300/60 bg-amber-100/70 px-3 py-1 text-xs font-medium text-amber-900">
                  {rotatedPages.length} rotated page(s)
                </div>
              ) : null}
              {largeDocument ? (
                <div className="rounded-full border border-ink/10 bg-white/75 px-3 py-1 text-xs font-medium text-ink/65">
                  Large document mode
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={openFilePicker}
          className="rounded-full border border-ink/10 bg-white/70 px-4 py-2 text-sm font-medium text-ink transition hover:border-ink/25"
        >
          Open PDF
        </button>
        {fileName ? (
          <button
            type="button"
            onClick={clearDocument}
            className="rounded-full border border-ink/10 bg-white/70 px-4 py-2 text-sm font-medium text-ink transition hover:border-ink/25"
          >
            Close
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          disabled={!fileName || documentLoadState !== "ready" || previewOpen}
          className="rounded-full border border-ink/10 bg-white/80 px-4 py-2 text-sm font-medium text-ink transition hover:border-ink/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Preview
        </button>
        <button
          type="button"
          onClick={() => setExportDialogOpen(true)}
          disabled={!fileName || documentLoadState !== "ready" || exportInProgress}
          className="rounded-full bg-ember px-4 py-2 text-sm font-medium text-white transition hover:bg-ember/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {exportInProgress ? "Exporting..." : "Export"}
        </button>
        <ZoomButton label="-" onClick={() => setZoom(Math.max(0.25, zoom - 0.1))} />
        <div className="min-w-16 rounded-full bg-white/80 px-3 py-1.5 text-center text-sm font-medium text-ink">
          {Math.round(zoom * 100)}%
        </div>
        <ZoomButton label="+" onClick={() => setZoom(Math.min(3, zoom + 0.1))} />
      </div>
    </header>
  );
}
