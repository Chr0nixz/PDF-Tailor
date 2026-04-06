# PDF-Tailor

PDF-Tailor is a local-first PDF cropping tool for the browser and desktop.

It focuses on one job: open a PDF, visually define crop regions, batch-apply them across pages, preview the result, and export a new file without sending documents to a server.

## Highlights

- Local-first: PDF files stay on the user's machine
- Visual crop editing with drag selection
- Edge and center-line snapping
- Preset paper sizes with 9-grid positioning
- Numeric margin editing with `mm / pt` switching
- Multi-page selection and batch apply
- Preview before export
- Two export modes: `Crop box` and `Redraw`
- Undo / redo and keyboard shortcuts
- Web Worker export pipeline
- Unit tests, E2E tests, and CI already in place

## Current Status

`v1.0` is effectively feature-complete for the initial public release.

Implemented:

- PDF loading and page rendering
- Interactive crop editing
- Multi-page workflow
- Preview and export
- Automated tests and GitHub Actions CI

Current limitation:

- `Redraw` preview/export is disabled for cropped pages rotated by `90°` or `270°`

## Screenshots

You can add repository screenshots here after publishing, for example:

```text
docs/screenshots/workspace.png
docs/screenshots/export-dialog.png
docs/screenshots/preview-modal.png
```

Suggested README image section after you capture assets:

```md
![Workspace](./docs/screenshots/workspace.png)
![Preview](./docs/screenshots/preview-modal.png)
```

## Features

### Editing

- Free-form crop rectangle creation
- Move and resize with 8 handles
- Snap to page edges and center lines
- Clear current page crop
- Keyboard nudging for precise adjustment

### Layout and Presets

- Preset paper sizes
- 9-point anchor positioning
- Margin-based editing
- `mm / pt` unit switching

### Multi-page Workflow

- Thumbnail sidebar
- `Ctrl/Cmd + Click` multi-select
- Apply current crop to selected pages
- Apply current crop to all pages

### Output

- Preview generated from the same export pipeline
- `Crop box` export for fast output
- `Redraw` export for true page resizing

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Zustand
- `pdfjs-dist`
- `pdf-lib`
- `@tanstack/react-virtual`
- Vitest
- Playwright
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

1. Open a local PDF file
2. Drag on the page canvas to create a crop rectangle
3. Adjust the crop via handles, presets, or margin inputs
4. Select more pages in the sidebar if you want to batch-apply the crop
5. Preview the output
6. Export a new PDF

## Keyboard Shortcuts

- `Ctrl/Cmd + Z`: Undo
- `Ctrl/Cmd + Shift + Z`: Redo
- `Ctrl/Cmd + Y`: Redo
- `Ctrl/Cmd + S`: Open export dialog
- `Ctrl/Cmd + C`: Copy current crop
- `Ctrl/Cmd + V`: Paste crop to selected pages or current page
- `Ctrl/Cmd + A`: Select all pages
- `Ctrl/Cmd + Enter`: Apply current crop to selected pages
- `Ctrl/Cmd + 0`: Reset zoom to `100%`
- `Ctrl/Cmd + +` / `Ctrl/Cmd + -`: Zoom
- `Delete` / `Backspace`: Clear current page crop
- `Escape`: Cancel draft crop or close modal
- `PageUp` / `PageDown`: Switch page
- `Tab` / `Shift + Tab`: Cycle pages
- `Space`: Open preview
- `Arrow keys`: Nudge crop rectangle
- `Shift + Arrow keys`: Larger nudge step

## Export Modes

### Crop box

Fast and practical. Adjusts page boxes directly without rebuilding page content.

### Redraw

Creates new pages sized to the crop result and redraws the page content.

Current limitation:

- Disabled when cropped rotated pages (`90°` / `270°`) are present

## Testing

Unit test coverage currently includes:

- Coordinate conversion
- Unit conversion
- Snap logic
- Export logic
- Rotation and large-document warnings

E2E coverage currently includes:

- Upload -> crop -> batch apply -> preview -> export
- Rotated-page restriction flow for `Redraw`

Run all checks locally:

```bash
npm test
npm run test:e2e
npm run build
```

## CI

GitHub Actions workflow:

- `npm ci`
- `npm test`
- `npm run build`
- `npm run test:e2e`

Workflow file: [`.github/workflows/ci.yml`](./.github/workflows/ci.yml)

## Project Structure

```text
src/
  components/   UI components
  hooks/        rendering and interaction logic
  store/        Zustand state management
  types/        shared types
  utils/        geometry, export, conversion, warnings
  workers/      PDF export worker
docs/
  implementation-plan.md
  v1.0-release-checklist.md
e2e/
  app.spec.ts
src-tauri/
  Tauri desktop shell
```

## Documentation

- [Implementation Notes](./docs/implementation-plan.md)
- [v1.0 Release Checklist](./docs/v1.0-release-checklist.md)

## Roadmap

Planned next steps after `v1.0`:

- Support `Redraw` for rotated cropped pages
- Add export progress reporting
- Expand cross-browser E2E coverage
- Improve large-document thumbnail caching
- Polish desktop packaging and release flow

## Contributing

Issues and pull requests are welcome.

Recommended contribution flow:

1. Open an issue for bugs, UX problems, or feature proposals
2. Keep pull requests focused and easy to review
3. Run local validation before submitting:

```bash
npm test
npm run test:e2e
npm run build
```

If you change user-facing behavior, update the README or docs alongside the code.

## Known Limitations

- `Redraw` does not yet support cropped rotated pages
- E2E currently runs only on Chromium
- Export progress is not yet surfaced as a percentage
- Preset sizes are clamped when the source page is smaller than the target size

## License

This project is licensed under the Mozilla Public License 2.0.

See [LICENSE](./LICENSE) for the full text.
