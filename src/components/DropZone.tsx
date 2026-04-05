import { useMemo } from "react";
import { usePdfStore } from "@/store/usePdfStore";

function createMockPdfBuffer() {
  return new Uint8Array([37, 80, 68, 70]);
}

export function DropZone() {
  const setDocument = usePdfStore((state) => state.setDocument);
  const clearDocument = usePdfStore((state) => state.clearDocument);
  const hintLines = useMemo(
    () => [
      "阶段 1 已完成骨架搭建，阶段 2 会接入真实 PDF 解析与渲染。",
      "当前按钮会注入一个占位文档状态，用于验证布局、store 与后续流程接口。",
    ],
    [],
  );

  return (
    <section className="panel-surface relative mt-5 flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-10 md:px-10">
      <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_center,_rgba(184,92,56,0.14),_transparent_70%)]" />
      <div className="relative z-10 flex max-w-3xl flex-col items-center text-center">
        <div className="mb-6 rounded-full border border-ink/10 bg-white/70 px-4 py-1 text-xs font-medium uppercase tracking-[0.24em] text-ink/60">
          Phase 1 Scaffold
        </div>
        <h1 className="max-w-2xl text-4xl font-semibold leading-tight md:text-6xl">
          PDF 裁剪工作台的基础工程已经就位
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-ink/70 md:text-lg">
          当前版本先完成 Vite、TypeScript、Tailwind、Zustand、Worker
          和三栏布局框架，供后续 PDF 加载、框选裁剪与导出功能直接接入。
        </p>
        <div className="mt-8 grid w-full gap-4 md:grid-cols-2">
          {hintLines.map((line) => (
            <div
              key={line}
              className="rounded-[24px] border border-ink/10 bg-white/75 px-5 py-4 text-left text-sm leading-6 text-ink/70"
            >
              {line}
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() =>
              setDocument({
                file: new File([""], "phase-1-placeholder.pdf", {
                  type: "application/pdf",
                }),
                fileName: "phase-1-placeholder.pdf",
                fileBuffer: createMockPdfBuffer(),
                pages: [
                  { pageIndex: 0, widthPt: 595, heightPt: 842, rotation: 0 },
                  { pageIndex: 1, widthPt: 595, heightPt: 842, rotation: 0 },
                  { pageIndex: 2, widthPt: 612, heightPt: 792, rotation: 0 },
                ],
                pageCount: 3,
              })
            }
            className="rounded-full bg-ink px-6 py-3 text-sm font-medium text-white transition hover:bg-ink/90"
          >
            进入骨架预览
          </button>
          <button
            type="button"
            onClick={clearDocument}
            className="rounded-full border border-ink/15 bg-white px-6 py-3 text-sm font-medium text-ink transition hover:border-ink/30"
          >
            重置状态
          </button>
        </div>
      </div>
    </section>
  );
}
