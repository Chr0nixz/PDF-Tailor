import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { usePdfStore } from "@/store/usePdfStore";
import { getDocumentDiagnostics, getActiveDiagnostics } from "@/utils/documentWarnings";
import type { Diagnostic } from "@/utils/documentWarnings";

function DiagnosticItem({ diag }: { diag: Diagnostic }) {
  const { t } = useTranslation();
  const setCurrentPage = usePdfStore((state) => state.setCurrentPage);
  const params = diag.messageParams as Record<string, string> | undefined;
  const firstPage = diag.pageIndices[0];

  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-ink/70">{t(diag.messageKey as any, params)}</span>
      {firstPage !== undefined && (
        <button
          type="button"
          onClick={() => setCurrentPage(firstPage)}
          className="rounded-full border border-ink/10 bg-white/80 px-2.5 py-1 text-xs font-medium text-ink transition hover:border-ink/20 dark:border-white/10 dark:bg-white/5 dark:text-ink-light dark:hover:border-white/20"
        >
          {t("diagnostics.jumpToPage", { page: firstPage + 1 })}
        </button>
      )}
    </div>
  );
}

export function DiagnosticPanel() {
  const { t } = useTranslation();
  const pages = usePdfStore((state) => state.pages);
  const pageCrops = usePdfStore((state) => state.pageCrops);

  const diagnostics = useMemo(
    () => getDocumentDiagnostics(pages, pageCrops),
    [pages, pageCrops],
  );
  const activeDiags = useMemo(() => getActiveDiagnostics(diagnostics), [diagnostics]);

  if (activeDiags.length === 0) return null;

  return (
    <div className="rounded-[20px] border border-ink/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
      <div className="mb-3 text-xs uppercase tracking-[0.18em] text-ink/45">
        {t("diagnostics.title")}
      </div>
      <div className="space-y-2">
        {activeDiags.map((diag) => (
          <DiagnosticItem key={diag.id} diag={diag} />
        ))}
      </div>
    </div>
  );
}
