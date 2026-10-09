# PDF-Tailor

PDF-Tailor is a local-first PDF cropping tool for the browser and desktop.

It focuses on one job: open a PDF, visually define crop regions, batch-apply them across pages using rules or manual selection, preview the result, and export a new file without sending documents to a server.

## Highlights

- **Local-first**: PDF files stay on your machine — browser or desktop
- **Split view**: Compare original and cropped side-by-side in real time
- **Rule-based batch operations**: Apply crops by page rules (odd/even, same size, same rotation, range, every N pages) without manual multi-select
- **Auto-crop**: One-click content boundary detection for scanned documents
- **Drag-and-drop page reordering**: Arrange pages before export, then restore original order
- **Diagnostic panel**: At-a-glance view of rotated, mixed-size, and uncropped pages
- **Print preview**: Dedicated print-ready preview with page navigation
- **Theme support**: Paper, Midnight, Warm, and High Contrast themes
- **Keyboard shortcuts**: Full shortcut reference accessible from the UI
- **Native desktop workflow**: Open and save dialogs, recent files list
- **Undo / redo** for all crop operations
- **Web Worker export pipeline** — UI stays responsive during large exports
- **Column & spread splitting** — split two-column research papers or book spreads into sequential reading pages
- **Auto-crop 2.0** — histogram-based background detection with anti-border artifact and projection profiling
- **Facing pages & mirror margins** — automatically swap left/right margins between odd and even pages for book binding
- **Project session export/import** — save and restore your complete setup via `.pdftailor` files
- **Full rotation support in Redraw export** — seamless redraw exports for 90°/180°/270° pages
- **Real-time export dashboard** — dynamic progress, processing speed, ETA, and split-page count forecasting
- **LTR / RTL** — English and Chinese (中文) fully localized

## Current Status

**v1.4** is the current active release.

### What's New in v1.4:
- **Vector Text-Layer Auto-Snap**: Instant milliseconds bounding box extraction from PDF glyph transform vectors, achieving 100% tight alignment without rasterization overhead or character clipping.
- **Header & Footer Stripping (Exclusion Bands)**: Define customizable top header and bottom footer exclusion heights to strip running headers and footers across single-page and multi-column exports.
- **N-Grid Multi-Segment Page Splitting**: Split lecture handouts (e.g. 2×2, 2×3 slides per page) and multi-column newspaper layouts into sequential single-reading pages with customizable rows, columns, and reading order (left-to-right / top-to-bottom).
- **Sequential Re-pagination & Bates Numbering**: Automatically overlay standardized running page numbers on exported documents, with configurable positions, format templates (`Page n of total`, `n / total`, `n`), and margin offsets.

### What's New in v1.3:
- **Two-Column / Multi-Column Page Splitting**: Split two-column papers (arXiv, IEEE, ACM) or double-page scanned spreads into sequential single-column pages, with adjustable split ratio and gutter spacing.
- **Auto-Crop 2.0 (Intelligent Border Filtering)**: Multi-point luminance histogram mode sampling filters out dark scanner frames, shadow gradients, and isolated noise particles.
- **Live Export Dashboard 2.0**: Accurate progress bar with speed (pages/sec), real-time ETA calculation, and output page forecasting.

### What's New in v1.2:
- **Mirror Margins (Facing Pages)**: Auto-swap left/right margins between odd/even pages for double-sided bound book layouts.
- **Project Session File (`.pdftailor`)**: Export and import complete crop regions, page sequences, and templates.
- **Full Rotation Support in Redraw Mode**: Mathematical affine transform compensation for 90°/180°/270° rotated pages in Redraw mode.
- **Export Page Order Preservation**: Reordered pages strictly retain custom order in exported PDF documents.

All items from previous releases remain fully supported:

| Priority | Feature | Status |
|----------|---------|--------|
| P0 | Page identity model (`sourceId` vs display order) | ✅ |
| P0 | Page reordering with drag-and-drop + restore | ✅ |
| P0 | Full Redraw rotation support (90° / 180° / 270°) | ✅ |
| P0 | Column & spread page splitting (two-column papers) | ✅ |
| P1 | Auto-crop 2.0 (histogram sampling & border exclusion) | ✅ |
| P1 | Export dashboard 2.0 (pages/sec speed & ETA forecast) | ✅ |
| P1 | Facing pages & mirror margins for book layouts | ✅ |
| P1 | Session save & load (`.pdftailor`) | ✅ |
| P1 | Rule-based batch apply | ✅ |
| P1 | Thumbnail LRU cache + adjacent preheat | ✅ |
| P1 | Native desktop open / save / recent files | ✅ |
| P2 | Document diagnostic panel | ✅ |
| P2 | Keyboard shortcut help overlay | ✅ |

Also shipped: Split View, Print Preview, Theme Selector, Onboarding Overlay.

## Screenshots

Screenshots can be added after publishing.

## Feature Details

### Editing

- Free-form crop rectangle creation with 8-handle resize
- Move and resize with snap to page edges and center lines
- Preset paper sizes with 9-point anchor positioning
- Numeric margin editing with `mm / pt` unit switching
- Clear current page crop
- Keyboard nudging for precise adjustment

### Page Management

- Thumbnail sidebar with current-page highlight
- `Ctrl/Cmd + Click` multi-select
- Apply current crop to selected pages or all pages
- Drag-and-drop page reordering
- **Restore original order** with one action
- Jump to any page from the diagnostic panel

### Rule-Based Batch Operations

Apply crops by rule instead of manually selecting pages:

- **Odd / Even pages**
- **Same size as reference page**
- **Same rotation as reference page**
- **Page range** (e.g., pages 3–10)
- **Every N pages** with offset (e.g., every 3 pages starting from page 2)

Each rule shows a live preview of how many pages will be affected before you apply it.

### Auto-Crop

One-click content boundary detection using high-contrast edge analysis. Best for scanned documents with uniform backgrounds. Confidence score shown; results remain adjustable after auto-detection.

### Split View

Drag the divider to compare the original page and cropped result side-by-side. The cropped preview updates in real time as you adjust the crop rectangle.

### Output

- **Preview** generated from the same export pipeline as final export
- **Print Preview** with page navigation and browser print integration
- **`Crop box`** export — fast, adjusts page boxes directly
- **`Redraw`** export — rebuilds pages sized to crop result (with full 90°/180°/270° orientation support)
- Export scope: current page, selected pages, or all pages

### Themes

Four themes available: **Paper** (light), **Midnight** (dark), **Warm**, and **High Contrast**. Theme persists across sessions.

### Localization

Full UI localization in **English** and **Chinese (中文)**. Language can be switched from the settings menu.

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Zustand (state management)
- `pdfjs-dist` (PDF rendering)
- `pdf-lib` (PDF export)
- `@tanstack/react-virtual` (virtualized thumbnail list)
- Vitest (unit tests)
- Playwright (E2E tests)
- Tauri (desktop packaging)

## Getting Started

### Web Development

```bash
npm install
npm run dev
```

Default dev URL is usually [http://localhost:5173](http://localhost:5173).

### Desktop Development

```bash
npm install
npm run tauri:dev
```

### Production Build

Web build:

```bash
npm run build
```

Desktop build:

```bash
npm run tauri:build
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build production web bundle |
| `npm run preview` | Preview production web bundle |
| `npm test` | Run Vitest unit tests |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run tauri:dev` | Start desktop app in dev mode |
| `npm run tauri:build` | Build desktop app |

## Usage

1. Open a PDF (drag-and-drop onto the window, use the Open button, or native desktop dialog)
2. The onboarding overlay guides first-time users through the main workflow
3. Drag on the page canvas to create a crop rectangle
4. Adjust the crop via handles, presets, or margin inputs
5. Use **Split View** to compare original and cropped side-by-side
6. Apply to more pages — manually via multi-select, or automatically via **rules**
7. Click **Auto-Crop** to detect content boundaries on the current page
8. Run **Preview** or **Print Preview** to check the result
9. Export a new PDF

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` / `Ctrl/Cmd + Y` | Redo |
| `Ctrl/Cmd + S` | Open export dialog |
| `Ctrl/Cmd + C` | Copy current crop |
| `Ctrl/Cmd + V` | Paste crop to selected pages |
| `Ctrl/Cmd + A` | Select all pages |
| `Ctrl/Cmd + Enter` | Apply current crop to selected pages |
| `Ctrl/Cmd + 0` | Reset zoom to 100% |
| `Ctrl/Cmd + +` / `Ctrl/Cmd + -` | Zoom in / out |
| `Delete` / `Backspace` | Clear current page crop |
| `Escape` | Cancel draft crop or close modal |
| `PageUp` / `PageDown` | Previous / next page |
| `Tab` / `Shift + Tab` | Cycle pages |
| `Space` | Open preview |
| `Arrow keys` | Nudge crop rectangle (1 pt) |
| `Shift + Arrow keys` | Nudge crop rectangle (5 pt) |
| `Ctrl/Cmd + Shift + R` | Restore original page order |

Full shortcut reference available via the **⌨** button in the header.

## Export Modes

### Crop box

Fast and practical. Adjusts page boxes directly without rebuilding page content.

### Redraw

Creates new pages sized to the crop result and redraws the page content.

## Testing

Unit test coverage includes:

- Coordinate conversion
- Unit conversion
- Snap logic
- Export logic
- Rotation and large-document warnings
- Rule-based page selection

E2E coverage includes:

- Upload → crop → batch apply → preview → export
- Rotated-page restriction flow for `Redraw`
- Page reordering and order restoration

Run all checks locally:

```bash
npm test
npm run test:e2e
npm run build
```

## CI

GitHub Actions workflow runs on every pull request and push to `main`:

- `npm ci`
- `npm test`
- `npm run build`
- `npm run test:e2e`

## Project Structure

```text
src/
  components/   UI components
  hooks/        rendering and interaction logic
  store/        Zustand state management
  types/        shared types
  utils/        geometry, export, conversion, warnings, rules
  workers/      PDF export worker
e2e/
  app.spec.ts              Playwright end-to-end tests
src-tauri/
  Tauri desktop shell
```

## Known Limitations

- E2E currently runs only on Chromium
- Preset sizes are clamped when the source page is smaller than the target size

## License

This project is licensed under the Mozilla Public License 2.0.

See [LICENSE](./LICENSE) for the full text.
