import { useRef, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { usePdfStore } from "@/store/usePdfStore";
import { useToastStore } from "@/store/useToastStore";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UndoRedoIndicator } from "@/components/UndoRedoIndicator";
import { getRotatedPages, isLargeDocument } from "@/utils/documentWarnings";
import { isPdfFile, readFileAsUint8Array } from "@/utils/fileIO";
import i18n from "@/i18n/i18n";

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
      className="rounded-full border border-ink/10 bg-white/70 px-3 py-1.5 text-sm font-medium text-ink transition hover:border-ink/25 active:scale-[0.97] dark:border-white/10 dark:bg-white/5 dark:text-ink-light dark:hover:border-white/20"
    >
      {label}
    </button>
  );
}

export function Header() {
  const { t } = useTranslation();
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
  const addToast = useToastStore((state) => state.addToast);
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
      addToast({ type: "error", message: t("errors.selectPdfFile") });
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
      addToast({
        type: "error",
        message: error instanceof Error ? error.message : t("errors.cannotReadFile"),
      });
    }
  };

  return (
    <header className="panel-surface flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between md:px-6">
      <div className="flex min-w-0 items-center gap-4">
        <div className="rounded-[20px] bg-ink px-4 py-3 text-white dark:bg-ink-light dark:text-mist-dark">
          <div className="text-xs uppercase tracking-[0.24em] text-white/60 dark:text-mist-dark/60">{t("app.name")}</div>
          <div className="mt-1 text-lg font-semibold">{t("app.version")}</div>
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-ink/55 dark:text-ink-light/55">{t("header.documentLabel")}</div>
          <div className="mt-1 truncate text-base font-semibold">
            {fileName ?? t("header.noDocument")}
          </div>
          <div className="text-sm text-ink/55 dark:text-ink-light/55">
            {documentLoadState === "loading"
              ? t("header.loadingPdf")
              : pageCount > 0
                ? t("header.loadedPages", { count: pageCount })
                : t("header.selectPdfToStart")}
          </div>
          {fileName ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {rotatedPages.length > 0 ? (
                <div className="rounded-full border border-amber-300/60 bg-amber-100/70 px-3 py-1 text-xs font-medium text-amber-900">
                  {t("header.rotatedPages", { count: rotatedPages.length })}
                </div>
              ) : null}
              {largeDocument ? (
                <div className="rounded-full border border-ink/10 bg-white/75 px-3 py-1 text-xs font-medium text-ink/65">
                  {t("header.largeDocMode")}
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
          className="rounded-full border border-ink/10 bg-white/70 px-4 py-2 text-sm font-medium text-ink transition hover:border-ink/25 active:scale-[0.97] dark:border-white/10 dark:bg-white/5 dark:text-ink-light dark:hover:border-white/20"
        >
          {t("header.openPdf")}
        </button>
        {fileName ? (
          <button
            type="button"
            onClick={clearDocument}
            className="rounded-full border border-ink/10 bg-white/70 px-4 py-2 text-sm font-medium text-ink transition hover:border-ink/25 active:scale-[0.97] dark:border-white/10 dark:bg-white/5 dark:text-ink-light dark:hover:border-white/20"
          >
            {t("header.close")}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          disabled={!fileName || documentLoadState !== "ready" || previewOpen}
          className="rounded-full border border-ink/10 bg-white/80 px-4 py-2 text-sm font-medium text-ink transition hover:border-ink/20 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-ink-light dark:hover:border-white/20"
        >
          {t("header.preview")}
        </button>
        <button
          type="button"
          onClick={() => setExportDialogOpen(true)}
          disabled={!fileName || documentLoadState !== "ready" || exportInProgress}
          className="rounded-full bg-ember px-4 py-2 text-sm font-medium text-white transition hover:bg-ember/90 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-ember-dark dark:hover:bg-ember-dark/90"
        >
          {exportInProgress ? t("header.exporting") : t("header.export")}
        </button>
        <UndoRedoIndicator />
        <ZoomButton label="-" onClick={() => setZoom(Math.max(0.25, zoom - 0.1))} />
        <div className="min-w-16 rounded-full bg-white/80 px-3 py-1.5 text-center text-sm font-medium text-ink dark:bg-white/5 dark:text-ink-light">
          {Math.round(zoom * 100)}%
        </div>
        <ZoomButton label="+" onClick={() => setZoom(Math.min(3, zoom + 0.1))} />
        {/* Theme toggle */}
        <ThemeToggle />
        {/* Language switcher */}
        <button
          type="button"
          onClick={() => i18n.changeLanguage(i18n.language.startsWith("en") ? "zh" : "en")}
          className="rounded-full border border-ink/10 bg-white/70 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-ink transition hover:border-ink/25 active:scale-[0.97] dark:border-white/10 dark:bg-white/5 dark:text-ink-light dark:hover:border-white/20"
        >
          {i18n.language.startsWith("en") ? "中" : "EN"}
        </button>
      </div>
    </header>
  );
}
