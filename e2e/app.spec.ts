import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { degrees, PDFDocument, StandardFonts } from "pdf-lib";

async function createSamplePdf() {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const firstPage = pdfDoc.addPage([400, 600]);
  firstPage.drawText("Page 1", {
    x: 24,
    y: 560,
    size: 20,
    font,
  });

  const secondPage = pdfDoc.addPage([420, 620]);
  secondPage.drawText("Page 2", {
    x: 24,
    y: 580,
    size: 20,
    font,
  });

  return Buffer.from(await pdfDoc.save());
}

async function createThreePagePdf() {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (const [index, width, height] of [
    [0, 400, 600],
    [1, 420, 620],
    [2, 440, 640],
  ] as const) {
    const nextPage = pdfDoc.addPage([width, height]);
    nextPage.drawText(`Page ${index + 1}`, {
      x: 24,
      y: height - 40,
      size: 20,
      font,
    });
  }

  return Buffer.from(await pdfDoc.save());
}

async function createRotatedPdf() {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const page = pdfDoc.addPage([400, 600]);
  page.setRotation(degrees(90));
  page.drawText("Rotated page", {
    x: 24,
    y: 560,
    size: 20,
    font,
  });

  return Buffer.from(await pdfDoc.save());
}

async function uploadPdf(page: Page, name: string, buffer: Buffer) {
  await page.goto("/");
  // Dismiss onboarding overlay if present so it doesn't block interactions
  const skipBtn = page.getByRole("button", { name: /跳过|Skip/i });
  if (await skipBtn.isVisible().catch(() => false)) {
    await skipBtn.click().catch(() => {});
  }
  await page.getByTestId("pdf-file-input").setInputFiles({
    name,
    mimeType: "application/pdf",
    buffer,
  });
  // Wait for the loading indicator to disappear and content to appear
  await page.waitForLoadState("networkidle");
}

async function createCropSelection(page: Page) {
  const cropLayer = page.getByTestId("crop-layer");
  await expect(cropLayer).toBeVisible();

  const box = await cropLayer.boundingBox();
  if (!box) {
    throw new Error("Crop layer bounds are unavailable.");
  }

  await page.mouse.move(box.x + 80, box.y + 100);
  await page.mouse.down();
  await page.waitForTimeout(50);
  await page.mouse.move(box.x + 260, box.y + 340, { steps: 12 });
  await page.waitForTimeout(50);
  await page.mouse.up();
  await page.waitForTimeout(100);

  await expect(page.getByTestId("crop-rectangle")).toBeVisible();
}

test("loads a PDF, crops a page, previews, and exports", async ({ page }) => {
  await uploadPdf(page, "sample.pdf", await createSamplePdf());

  await expect(page.getByText("sample.pdf")).toBeVisible();
  await expect(page.getByText("已载入 2 页")).toBeVisible();
  await expect(page.getByTestId("page-thumbnail-1")).toBeVisible();

  await createCropSelection(page);

  await page.getByTestId("page-thumbnail-1").click({ modifiers: ["Control"] });
  await page.getByTestId("page-thumbnail-0").click({ modifiers: ["Control"] });
  await page.getByTestId("apply-current-crop-to-selected-pages").click();

  await page.getByTestId("page-thumbnail-1").click();
  await expect(page.getByTestId("crop-rectangle")).toBeVisible();

  await page.getByTestId("preview-button").click();
  await expect(page.getByTestId("preview-dialog")).toBeVisible();
  await expect(page.getByTestId("preview-dialog").getByText(/\/ 2/)).toBeVisible();
  await expect(page.getByTestId("preview-dialog").locator("canvas")).toBeVisible();
  await page.getByTestId("preview-dialog-close").click();
  await expect(page.getByTestId("preview-dialog")).toBeHidden();

  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("export-button").click();
  await expect(page.getByTestId("export-dialog")).toBeVisible();
  await page.getByTestId("export-dialog").getByRole("button", { name: "导出 PDF" }).click();

  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("sample-crop-box.pdf");
});

test("supports redraw preview and export for cropped rotated pages", async ({ page }) => {
  await uploadPdf(page, "rotated.pdf", await createRotatedPdf());

  await expect(page.getByText("rotated.pdf")).toBeVisible();
  await expect(page.getByText("已载入 1 页")).toBeVisible();
  await expect(page.getByText("1 个旋转页", { exact: true })).toBeVisible();
  await expect(page.getByText("90°")).toBeVisible();

  await createCropSelection(page);

  await page.getByTestId("preview-button").click();
  await expect(page.getByTestId("preview-dialog")).toBeVisible();
  const redrawBtn = page.getByTestId("preview-dialog").getByRole("button", { name: "Redraw" });
  await expect(redrawBtn).toBeEnabled();
  await redrawBtn.click();
  await expect(page.getByTestId("preview-dialog").locator("canvas")).toBeVisible();
  await page.getByTestId("preview-dialog-close").click({ force: true });

  await page.getByTestId("export-button").click();
  await expect(page.getByTestId("export-dialog")).toBeVisible();
  await page.getByTestId("export-dialog").getByRole("button", { name: /Redraw/i }).click();

  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("export-dialog").getByRole("button", { name: "导出 PDF" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("rotated-redraw.pdf");
});

test("selects a page range and clears crops in bulk", async ({ page }) => {
  await uploadPdf(page, "three-pages.pdf", await createThreePagePdf());

  await expect(page.getByText("three-pages.pdf")).toBeVisible();
  await expect(page.getByText("已载入 3 页")).toBeVisible();

  await createCropSelection(page);
  await page.getByTestId("apply-current-crop-to-all-pages").click();

  await page.getByText("批量选择").click();
  await page.getByText("页码范围").click();
  await page.getByPlaceholder("例如：1-5，8，10-12").fill("2-3");
  await page.getByRole("button", { name: "选择", exact: true }).click();
  await expect(page.getByText("已选 2 页").first()).toBeVisible();
  await page.getByRole("button", { name: /清除选中页裁剪 \(2\)/i }).click();

  await page.getByTestId("page-thumbnail-1").click();
  await expect(page.getByTestId("crop-rectangle")).toBeHidden();

  await page.getByTestId("page-thumbnail-0").click();
  await expect(page.getByTestId("crop-rectangle")).toBeVisible();
});

test("exports only the selected pages when export range is scoped", async ({ page }) => {
  await uploadPdf(page, "three-pages.pdf", await createThreePagePdf());

  await expect(page.getByText("three-pages.pdf")).toBeVisible();
  await expect(page.getByText("已载入 3 页")).toBeVisible();

  await page.getByText("批量选择").click();
  await page.getByText("页码范围").click();
  await page.getByPlaceholder("例如：1-5，8，10-12").fill("2-3");
  await page.getByRole("button", { name: "选择", exact: true }).click();
  await expect(page.getByText("已选 2 页").first()).toBeVisible();

  await page.getByTestId("export-button").click();
  await expect(page.getByTestId("export-dialog")).toBeVisible();
  await page
    .getByTestId("export-dialog")
    .getByRole("button", { name: /选中页/i })
    .click();

  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("export-dialog").getByRole("button", { name: "导出 PDF" }).click();

  const download = await downloadPromise;
  const downloadPath = await download.path();

  if (!downloadPath) {
    throw new Error("Download path is unavailable.");
  }

  const bytes = await readFile(downloadPath);
  const exportedPdf = await PDFDocument.load(bytes);
  expect(exportedPdf.getPageCount()).toBe(2);
});
