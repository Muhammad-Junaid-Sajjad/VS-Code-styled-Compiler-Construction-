# CompileViz — Frontend (single-file IDE)

The browser side of CompileViz is a **self-contained single-file IDE** (`index.html`):
HTML + CSS + JavaScript with zero runtime dependencies. It renders the VS Code–style
workspace, calls the Flask backend, and draws every compilation phase.

## How it's built

- `index.html` — the entire IDE (editor, panels, terminal, theme, command palette). The
  authored master lives at the repo root as `index121.html` (byte-identical).
- Vite (`vite.config.ts`) copies `index.html` into `dist/`; Flask serves `dist/index.html`.

```bash
cd frontend
npm ci              # install dev tooling (Vite + Playwright)
npm run build       # → dist/index.html
npm run e2e         # Playwright tests against localhost:5000
```

## Layout

| Path             | Purpose                                                        |
|------------------|----------------------------------------------------------------|
| `index.html`     | Single-file IDE (source of truth: repo-root `index121.html`)   |
| `e2e/`           | 14 Playwright specs (UI, compile, real execution, SC-010)      |
| `package.json`   | Minimal: Vite (build) + Playwright (tests)                     |
| `vite.config.ts` | `outDir: dist`, dev-server proxy `/api → :5000`                |
| `tsconfig.json`  | Types for `vite.config.ts` + e2e specs                         |

## Development

The IDE talks to the backend at the same origin (`/api/*`). In dev, Vite proxies `/api`
to `http://localhost:5000`, so you can run the backend and the Vite dev server together:

```bash
# terminal 1 — backend
make run

# terminal 2 — vite dev server (optional; the built app is also fine)
cd frontend && npm run dev   # → http://localhost:5173
```

## Test

```bash
cd frontend
npx playwright test --config e2e/playwright.config.ts
```
