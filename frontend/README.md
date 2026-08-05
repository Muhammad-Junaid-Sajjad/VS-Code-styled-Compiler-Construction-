# CompileViz — Frontend (single-file IDE)

The browser side of CompileViz is a **self-contained single-file IDE** (`index.html`):
HTML + CSS + JavaScript with zero runtime dependencies. It renders the VS Code–style
workspace and draws every compilation phase.

## Hybrid engine (how it actually works)

The frontend carries its own **complete, always-on compiler written in JS** — the
**primary engine**:

```
tokenize → buildSym → parse → typeCheck → genIR → optimize → makeVM
```

This renders every panel (tokens, symbols, parse tree, IR, optimizer, insights, debugger)
instantly and **offline**. The Flask backend is reached **best-effort**: when it is
reachable, `Run` uses genuine `gcc`/`python3` and the `backend` terminal command probes the
real compiler; the status bar shows `⚡ backend: online/offline`. If the backend is down,
execution falls back to the built-in VM so nothing breaks offline.

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
| `index.html`     | Single-file IDE; primary in-browser 4-phase engine + hybrid runner |
| `e2e/`           | 14 Playwright specs (UI, compile, real execution, SC-010)      |
| `alive_audit.mjs`| Live compile+run audit (C/Python + pseudo-C fallback)          |
| `deep_audit.mjs` | Deep feature audit (search/outline/minimap/debugger/problems)  |
| `feat_audit.mjs` | Feature audit (menus, commands, theme, palette, panels)        |
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
