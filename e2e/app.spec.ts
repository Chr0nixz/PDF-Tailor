import { expect, test } from "@playwright/test";
import { PDFDocument, StandardFonts } from "pdf-lib";

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

test("loads a PDF, crops a page, previews, and exports", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("pdf-file-input").setInputFiles({
    name: "sample.pdf",
    mimeType: "application/pdf",
    buffer: await createSamplePdf(),
  });

  await expect(page.getByText("sample.pdf")).toBeVisible();
  await expect(page.getByText("2 pages loaded")).toBeVisible();
  await expect(page.getByRole("button", { name: /page 2/i })).toBeVisible();

  const cropLayer = page.getByTestId("crop-layer");
  await expect(cropLayer).toBeVisible();

  const box = await cropLayer.boundingBox();
  if (!box) {
    throw new Error("Crop layer bounds are unavailable.");
  }

  await page.mouse.move(box.x + 80, box.y + 100);
  await page.mouse.down();
  await page.mouse.move(box.x + 260, box.y + 340, { steps: 12 });
  await page.mouse.up();

  await expect(page.getByTestId("crop-rectangle")).toBeVisible();

  await page.getByRole("button", { name: /page 2/i }).click({ modifiers: ["Control"] });
  await page.getByRole("button", { name: /page 1/i }).click({ modifiers: ["Control"] });
  await page.getByRole("button", { name: /apply to selected pages/i }).click();

  await page.getByRole("button", { name: /page 2/i }).click();
  await expect(page.getByTestId("crop-rectangle")).toBeVisible();

  await page.getByRole("button", { name: "Preview" }).click();
  await expect(page.getByTestId("preview-dialog")).toBeVisible();
  await expect(page.getByTestId("preview-dialog").getByText(/\/ 2/)).toBeVisible();
  await expect(page.getByTestId("preview-dialog").locator("canvas")).toBeVisible();
  await page.getByTestId("preview-dialog").getByRole("button", { name: "Close" }).click();
  await expect(page.getByTestId("preview-dialog")).toBeHidden();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export" }).click();
  await expect(page.getByTestId("export-dialog")).toBeVisible();
  await page.getByTestId("export-dialog").getByRole("button", { name: "Export PDF" }).click();

  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("sample-crop-box.pdf");
});
