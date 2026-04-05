import { useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { usePdfStore } from "@/store/usePdfStore";
import { isPdfFile, readFileAsUint8Array } from "@/utils/fileIO";

export function DropZone() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const setDocument = usePdfStore((state) => state.setDocument);
  const setErrorMessage = usePdfStore((state) => state.setErrorMessage);

  const hintLines = useMemo(
    () => [
      "Drag a PDF file here or open one from disk.",
      "Phase 2 loads the document with pdf.js and renders the current page to canvas.",
    ],
    [],
  );

  const loadFile = async (file: File) => {
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

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";

    if (!file) {
      return;
    }

    await loadFile(file);
  };

  const handleDrop = async (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];
    if (!file) {
      return;
    }

    await loadFile(file);
  };

  return (
    <section
      onDragEnter={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        if (event.currentTarget === event.target) {
          setIsDragging(false);
        }
      }}
      onDrop={handleDrop}
      className={`panel-surface relative mt-5 flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-10 md:px-10 ${
        isDragging ? "border-sky bg-mist/80" : ""
      }`}
    >
      <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_center,_rgba(184,92,56,0.14),_transparent_70%)]" />
      <div className="relative z-10 flex max-w-3xl flex-col items-center text-center">
        <div className="mb-6 rounded-full border border-ink/10 bg-white/70 px-4 py-1 text-xs font-medium uppercase tracking-[0.24em] text-ink/60">
          Load PDF
        </div>
        <h1 className="max-w-2xl text-4xl font-semibold leading-tight md:text-6xl">
          Open a PDF and start the render pipeline
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-ink/70 md:text-lg">
          This phase wires up local file selection, pdf.js document parsing,
          page metadata extraction, canvas rendering, zoom control, and cleanup.
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
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-full bg-ink px-6 py-3 text-sm font-medium text-white transition hover:bg-ink/90"
          >
            Choose PDF
          </button>
          <div className="rounded-full border border-ink/15 bg-white px-6 py-3 text-sm font-medium text-ink">
            or drop a file anywhere in this panel
          </div>
        </div>
      </div>
    </section>
  );
}
