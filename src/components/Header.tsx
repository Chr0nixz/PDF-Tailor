import { useRef, type ChangeEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { usePdfStore } from "@/store/usePdfStore";
import { useToastStore } from "@/store/useToastStore";
import { getRotatedPages, isLargeDocument } from "@/utils/documentWarnings";
import { isPdfFile, readFileAsUint8Array, openPdfDialog, isTauriAvailable } from "@/utils/fileIO";
import { ThemeSelector } from "@/components/ThemeSelector";
import i18n from "@/i18n/i18n";

function SettingsMenu() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const clearDocument = usePdfStore((state) => state.clearDocument);
  const setShortcutSettingsOpen = usePdfStore((state) => state.setShortcutSettingsOpen);
  const fileName = usePdfStore((state) => state.fileName);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        title={t("header.settings")}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/10 bg-white/70 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-ink transition hover:border-ink/25 active:scale-[0.97] dark:border-white/10 dark:bg-white/5 dark:text-ink-light dark:hover:border-white/20"
      >
        ⚙
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-[16px] border border-ink/10 bg-white/95 p-2 shadow-lg backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
            {fileName && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    clearDocument();
                  }}
                  className="flex w-full items-center gap-2 rounded-[12px] px-3 py-2 text-sm text-ink hover:bg-ink/5 dark:text-ink-light dark:hover:bg-white/10"
                >
                  <span className="text-ink/70 dark:text-ink-light/70">✕</span>
                  {t("header.close")}
                </button>
                <div className="my-1 border-t border-ink/8 dark:border-white/10" />
              </>
            )}
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm text-ink/70 dark:text-ink-light/70">{t("settings.theme")}</span>
              <ThemeSelector />
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                i18n.changeLanguage(i18n.language.startsWith("en") ? "zh" : "en");
              }}
              className="flex w-full items-center gap-2 rounded-[12px] px-3 py-2 text-sm text-ink hover:bg-ink/5 dark:text-ink-light dark:hover:bg-white/10"
            >
              <span className="text-ink/70 dark:text-ink-light/70">文</span>
              {i18n.language.startsWith("en") ? "中文" : "English"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setShortcutSettingsOpen(true);
              }}
              className="flex w-full items-center gap-2 rounded-[12px] px-3 py-2 text-sm text-ink hover:bg-ink/5 dark:text-ink-light dark:hover:bg-white/10"
            >
              <span className="text-ink/70 dark:text-ink-light/70">⌨</span>
              {t("shortcuts.title")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function Header() {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fileName = usePdfStore((state) => state.fileName);
  const pageCount = usePdfStore((state) => state.pageCount);
  const file = usePdfStore((state) => state.file);
  const pages = usePdfStore((state) => state.pages);
  const documentLoadState = usePdfStore((state) => state.documentLoadState);
  const previewOpen = usePdfStore((state) => state.previewOpen);
  const printPreviewOpen = usePdfStore((state) => state.printPreviewOpen);
  const exportInProgress = usePdfStore((state) => state.exportInProgress);
  const viewMode = usePdfStore((state) => state.viewMode);
  const setDocument = usePdfStore((state) => state.setDocument);
  const setPreviewOpen = usePdfStore((state) => state.setPreviewOpen);
  const setPrintPreviewOpen = usePdfStore((state) => state.setPrintPreviewOpen);
  const setExportDialogOpen = usePdfStore((state) => state.setExportDialogOpen);
  const setViewMode = usePdfStore((state) => state.setViewMode);
  const addToast = useToastStore((state) => state.addToast);
  const rotatedPages = getRotatedPages(pages);
  const largeDocument = isLargeDocument(pageCount, file?.size);

  const addRecentFile = usePdfStore((state) => state.addRecentFile);

  const handleOpenPdf = async () => {
    // Try native Tauri dialog first
    if (isTauriAvailable()) {
      const result = await openPdfDialog();
      if (!result) return; // User cancelled

      const { path, buffer, name } = result;
      try {
        const file = new File([buffer as BlobPart], name, { type: "application/pdf" });
        setDocument({ file, fileBuffer: buffer, fileName: name });
        addRecentFile({ path, name, lastOpened: Date.now() });
      } catch (error) {
        addToast({
          type: "error",
          message: error instanceof Error ? error.message : t("errors.cannotReadFile"),
        });
      }
      return;
    }

    // Fallback to browser file input
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
    <header className="panel-surface relative z-30 flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between md:px-6">
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
          data-testid="open-pdf-button"
          onClick={handleOpenPdf}
          className="rounded-full border border-ink/10 bg-white/70 px-4 py-2 text-sm font-medium text-ink transition hover:border-ink/25 active:scale-[0.97] dark:border-white/10 dark:bg-white/5 dark:text-ink-light dark:hover:border-white/20"
        >
          {t("header.openPdf")}
        </button>
        <button
          type="button"
          data-testid="preview-button"
          aria-label={t("header.preview")}
          onClick={() => setPreviewOpen(true)}
          disabled={!fileName || documentLoadState !== "ready" || previewOpen}
          className="rounded-full border border-ink/10 bg-white/80 px-4 py-2 text-sm font-medium text-ink transition hover:border-ink/20 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-ink-light dark:hover:border-white/20"
        >
          {t("header.preview")}
        </button>
        <button
          type="button"
          data-testid="split-view-button"
          aria-label={t("header.splitView")}
          onClick={() => setViewMode(viewMode === "split" ? "crop" : "split")}
          disabled={!fileName || documentLoadState !== "ready"}
          className={`rounded-full border px-4 py-2 text-sm font-medium transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 ${
            viewMode === "split"
              ? "border-sky bg-sky/10 text-sky dark:border-sky-dark dark:bg-sky-dark/10 dark:text-sky-light"
              : "border-ink/10 bg-white/80 text-ink hover:border-ink/20 dark:border-white/10 dark:bg-white/5 dark:text-ink-light dark:hover:border-white/20"
          }`}
        >
          {t("header.splitView")}
        </button>
        <button
          type="button"
          data-testid="print-preview-button"
          aria-label={t("printPreview.title")}
          onClick={() => setPrintPreviewOpen(true)}
          disabled={!fileName || documentLoadState !== "ready" || printPreviewOpen}
          className="rounded-full border border-ink/10 bg-white/80 px-4 py-2 text-sm font-medium text-ink transition hover:border-ink/20 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-ink-light dark:hover:border-white/20"
        >
          {t("printPreview.title")}
        </button>
        <button
          type="button"
          data-testid="export-button"
          aria-label={t("header.export")}
          onClick={() => setExportDialogOpen(true)}
          disabled={!fileName || documentLoadState !== "ready" || exportInProgress}
          className="rounded-full bg-ember px-4 py-2 text-sm font-medium text-white transition hover:bg-ember/90 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-ember-dark dark:hover:bg-ember-dark/90"
        >
          {exportInProgress ? t("header.exporting") : t("header.export")}
        </button>
        <SettingsMenu />
      </div>
    </header>
  );
}
