import { describe, expect, it } from "vitest";
import {
  createSessionPayload,
  parseAndValidateSession,
} from "@/utils/sessionIO";

describe("sessionIO", () => {
  it("creates a well-formed session payload", () => {
    const session = createSessionPayload({
      fileName: "document.pdf",
      pageCount: 3,
      displayUnit: "mm",
      pageOrder: [0, 2, 1],
      pageCrops: {
        0: {
          pageIndex: 0,
          cropRect: { x: 10, y: 10, width: 200, height: 300, pageIndex: 0 },
          mode: "free",
          marginsPt: { top: 10, right: 10, bottom: 10, left: 10 },
          updatedAt: 123456,
        },
      },
      templates: [],
    });

    expect(session.format).toBe("pdf-tailor-session");
    expect(session.version).toBe("1.2.0");
    expect(session.fileName).toBe("document.pdf");
    expect(session.pageCount).toBe(3);
    expect(session.pageOrder).toEqual([0, 2, 1]);
    expect(session.pageCrops[0]?.cropRect?.width).toBe(200);
  });

  it("validates and parses a valid session JSON string", () => {
    const payload = createSessionPayload({
      fileName: "test.pdf",
      pageCount: 2,
      displayUnit: "pt",
      pageOrder: [0, 1],
      pageCrops: {},
    });
    const jsonStr = JSON.stringify(payload);

    const result = parseAndValidateSession(jsonStr, 2);
    expect(result.valid).toBe(true);
    expect(result.session?.fileName).toBe("test.pdf");
    expect(result.warning).toBeUndefined();
  });

  it("returns warning on page count mismatch", () => {
    const payload = createSessionPayload({
      fileName: "test.pdf",
      pageCount: 5,
      displayUnit: "pt",
      pageOrder: [0, 1, 2, 3, 4],
      pageCrops: {},
    });
    const jsonStr = JSON.stringify(payload);

    const result = parseAndValidateSession(jsonStr, 3);
    expect(result.valid).toBe(true);
    expect(result.warning).toBeDefined();
  });

  it("rejects non-json content", () => {
    const result = parseAndValidateSession("not a json string");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Invalid JSON");
  });

  it("rejects unrecognized format", () => {
    const result = parseAndValidateSession(JSON.stringify({ format: "other-format" }));
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Unrecognized file format");
  });

  it("sanitizes corrupt or non-finite numbers in pageCrops and pageOrder", () => {
    const raw = {
      format: "pdf-tailor-session",
      version: "1.2.0",
      exportedAt: 1000,
      fileName: "unsafe/file:name?.pdf",
      pageCount: 2,
      displayUnit: "invalid-unit",
      pageOrder: ["0", 1, -5, "abc"],
      pageCrops: {
        "0": {
          pageIndex: 0,
          cropRect: { x: "invalid", y: null, width: -10, height: 100 },
          marginsPt: { top: "abc", right: 20 },
        },
        "not-a-number": {
          pageIndex: 999,
        },
      },
    };

    const result = parseAndValidateSession(JSON.stringify(raw), 2);
    expect(result.valid).toBe(true);
    const session = result.session!;
    expect(session.displayUnit).toBe("mm");
    expect(session.pageOrder).toEqual([0, 1]);
    expect(session.pageCrops[0]?.cropRect).toBeNull();
    expect(session.pageCrops[0]?.marginsPt.right).toBe(20);
    expect(session.pageCrops[0]?.marginsPt.top).toBe(0);
    expect((session.pageCrops as any)["not-a-number"]).toBeUndefined();
  });

  it("preserves valid splitConfig and sanitizes malformed splitConfig in session", () => {
    const raw = {
      format: "pdf-tailor-session",
      version: "1.3.0",
      exportedAt: 2000,
      fileName: "split-paper.pdf",
      pageCount: 1,
      displayUnit: "mm",
      pageOrder: [0],
      pageCrops: {
        "0": {
          pageIndex: 0,
          cropRect: { x: 20, y: 30, width: 200, height: 300 },
          marginsPt: { top: 0, right: 0, bottom: 0, left: 0 },
          splitConfig: {
            direction: "vertical",
            splitRatio: 0.45,
            gutterPt: 15,
          },
        },
      },
    };

    const result = parseAndValidateSession(JSON.stringify(raw), 1);
    expect(result.valid).toBe(true);
    expect(result.session?.pageCrops[0]?.splitConfig).toEqual({
      direction: "vertical",
      splitRatio: 0.45,
      gutterPt: 15,
    });
  });
});
