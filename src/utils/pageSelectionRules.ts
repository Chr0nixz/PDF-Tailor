import type { PageMetadata } from "@/types";

export type PageSelectionRule =
  | { type: "odd" }
  | { type: "even" }
  | { type: "sameSize"; referenceSourceId: number }
  | { type: "sameRotation"; referenceSourceId: number }
  | { type: "range"; start: number; end: number }
  | { type: "everyN"; step: number; offset: number };

export function getRuleLabel(rule: PageSelectionRule, t: (key: string, opts?: object) => string): string {
  switch (rule.type) {
    case "odd":
      return t("rules.labelOdd");
    case "even":
      return t("rules.labelEven");
    case "sameSize":
      return t("rules.labelSameSize");
    case "sameRotation":
      return t("rules.labelSameRotation");
    case "range":
      return t("rules.labelRange", { start: rule.start + 1, end: rule.end + 1 });
    case "everyN":
      return t("rules.labelEveryN", { step: rule.step, offset: rule.offset + 1 });
  }
}

export function previewRule(
  rule: PageSelectionRule,
  pages: PageMetadata[],
): number[] {
  const results: number[] = [];

  for (let displayIdx = 0; displayIdx < pages.length; displayIdx++) {
    const page = pages[displayIdx];
    if (matchesRule(rule, page, displayIdx, pages)) {
      results.push(page.pageIndex);
    }
  }

  return results;
}

function matchesRule(
  rule: PageSelectionRule,
  page: PageMetadata,
  displayIdx: number,
  pages: PageMetadata[],
): boolean {
  switch (rule.type) {
    case "odd":
      return displayIdx % 2 === 0; // 0-based: 0,2,4... are "odd positions"

    case "even":
      return displayIdx % 2 === 1; // 0-based: 1,3,5... are "even positions"

    case "sameSize": {
      const ref = pages.find((p) => p.sourceId === rule.referenceSourceId);
      if (!ref) return false;
      return page.widthPt === ref.widthPt && page.heightPt === ref.heightPt;
    }

    case "sameRotation": {
      const ref = pages.find((p) => p.sourceId === rule.referenceSourceId);
      if (!ref) return false;
      return page.rotation === ref.rotation;
    }

    case "range": {
      // range is in display indices (0-based, inclusive)
      return displayIdx >= rule.start && displayIdx <= rule.end;
    }

    case "everyN": {
      return (displayIdx - rule.offset) % rule.step === 0 && displayIdx >= rule.offset;
    }
  }
}
