import { describe, expect, it } from "vitest";
import {
  formatUnit,
  fromDisplayUnit,
  mmToPt,
  ptToMm,
  toDisplayUnit,
} from "@/utils/unitConversion";

describe("unitConversion", () => {
  it("converts millimeters to points and back", () => {
    const a4WidthMm = 210;
    const widthPt = mmToPt(a4WidthMm);

    expect(widthPt).toBeCloseTo(595.2756, 4);
    expect(ptToMm(widthPt)).toBeCloseTo(a4WidthMm, 4);
  });

  it("maps display units in both directions", () => {
    expect(fromDisplayUnit(10, "pt")).toBe(10);
    expect(toDisplayUnit(10, "pt")).toBe(10);

    expect(fromDisplayUnit(25.4, "mm")).toBeCloseTo(72, 5);
    expect(toDisplayUnit(72, "mm")).toBeCloseTo(25.4, 5);
  });

  it("formats numbers with a stable precision", () => {
    expect(formatUnit(12.3456)).toBe("12.35");
    expect(formatUnit(12, 0)).toBe("12");
  });
});
