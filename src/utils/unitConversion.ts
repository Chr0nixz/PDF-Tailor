import type { PdfUnit } from "@/types";

const POINTS_PER_INCH = 72;
const MM_PER_INCH = 25.4;

export function mmToPt(valueMm: number) {
  return (valueMm / MM_PER_INCH) * POINTS_PER_INCH;
}

export function ptToMm(valuePt: number) {
  return (valuePt / POINTS_PER_INCH) * MM_PER_INCH;
}

export function fromDisplayUnit(value: number, unit: PdfUnit) {
  return unit === "mm" ? mmToPt(value) : value;
}

export function toDisplayUnit(valuePt: number, unit: PdfUnit) {
  return unit === "mm" ? ptToMm(valuePt) : valuePt;
}

export function formatUnit(value: number, fractionDigits = 2) {
  return value.toFixed(fractionDigits);
}
