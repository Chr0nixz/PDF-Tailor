import type { PaperSize } from "@/types";

export const PAPER_SIZES: PaperSize[] = [
  { id: "a3", label: "A3", widthMm: 297, heightMm: 420 },
  { id: "a4", label: "A4", widthMm: 210, heightMm: 297 },
  { id: "a5", label: "A5", widthMm: 148, heightMm: 210 },
  { id: "b4", label: "B4", widthMm: 250, heightMm: 353 },
  { id: "b5", label: "B5", widthMm: 176, heightMm: 250 },
  { id: "letter", label: "Letter", widthMm: 215.9, heightMm: 279.4 }
];

export function findPaperSize(id: string) {
  return PAPER_SIZES.find((size) => size.id === id) ?? null;
}
