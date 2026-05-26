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
- **LTR / RTL** — English and Chinese (中文) fully localized

## Current Status

**v1.1** is the current stable release.

All items from the v1.1 roadmap are implemented:

| Priority | Feature | Status |
|----------|---------|--------|
| P0 | Page identity model (`sourceId` vs display order) | ✅ |
| P0 | Page reordering with drag-and-drop + restore | ✅ |
| P1 | Rule-based batch apply | ✅ |
| P1 | Auto-crop v1 (high-contrast edge detection) | ✅ |
| P1 | Thumbnail LRU cache + adjacent preheat | ✅ |
| P1 | Native desktop open / save / recent files | ✅ |
| P2 | Document diagnostic panel | ✅ |
| P2 | Keyboard shortcut help overlay | ✅ |

Also shipped in v1.1: Split View, Print Preview, Theme Selector, Onboarding Overlay.

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
- **`Redraw`** export — rebuilds pages sized to crop result
- Export scope: current page, selected pages, or all pages

Current limitation:

- `Redraw` is disabled for pages cropped at `90°` or `270°` rotation

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

- `Redraw` does not yet support cropped rotated pages (`90°` / `270°`)
- E2E currently runs only on Chromium
- Export progress is shown as a spinner; percentage reporting is not yet implemented
- Preset sizes are clamped when the source page is smaller than the target size

## License

This project is licensed under the Mozilla Public License 2.0.

See [LICENSE](./LICENSE) for the full text.
