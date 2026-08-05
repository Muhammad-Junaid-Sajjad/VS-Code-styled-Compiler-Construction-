# CompileViz — Complete Project Guide

> **How to understand, run, and navigate this whole project.** Read this top-to-bottom once
> and you'll know where every file lives and what it does, how the pieces talk, and how to run,
> test, and demo it for a showcase.

---

## 1. What the project is

**CompileViz** is a browser-based IDE that teaches compiler construction. You paste a **C** or
**Python** program and watch it move through the classic compilation pipeline, each phase shown
in its own panel:

```
Lexical → Syntax → Semantic → Intermediate Code (IR) → (optional) real execution
```

The IDE is **hybrid**: a self-contained in-browser engine is the primary, always-on compiler that
fills every panel instantly and offline; the Flask backend provides the *real* native pipeline and
real code execution on a best-effort basis when reachable. `Run` uses genuine `gcc`/`python3` when
online and falls back to the in-browser VM otherwise.

```
Browser (index.html)
   │  PRIMARY ENGINE (JS, every compile, offline):
   │     tokenize → build → parse → typeCheck → genIR → optimize → makeVM
   │     fills tokens/symbols/parse/ir/opt/debug/insights panels
   │  best-effort (when Flask reachable):
   │     GET /api/status        → status-bar badge "backend: online"
   │     POST /api/run          → code_runner (gcc / python3) real execution
   │     POST /api/compile      → real tokens/IR/errors (via `backend` command)
   ▼
Flask backend  (backend/)
   │  C:      compiler_runner → native compiler binary  (compiler/)
   │  C:      lexer_parser + tree_builder
   │  Python: python_analyzer (stdlib tokenize + ast)
   │  POST /api/run  → code_runner (gcc / python3) for real execution
   ▼
JSON response (one schema for both languages)
```

---

## 2. The repo tree — every file explained

```
Project-Compiler/
│
├── Makefile            ★ THE build/test/run orchestrator (start here)
├── README.md           ★ top-level marketing + quickstart (wire up display)
├── LICENSE
├── AGENTS.md / CLAUDE.md   agent rules (ignore for running)
├── index.html          ★ the single-file IDE (the app you use)
├── index121.html          the authored "master" copy (byte-identical to index.html)
│
├── docs/
│   ├── screenshot-app.png        IDE main window
│   ├── screenshot-compiled.png   IDE after compiling C sample
│   ├── GUIDE.md                  this file
│   └── SRS.md                    full Software Requirements Specification (IEEE-style)
│
├── backend/          ★ Python Flask JSON API
│   ├── app.py            server + all routes (/api/status · compile · tokenize · run)
│   ├── compiler_runner.py  runs compiler/compiler (stdin→stdout) safely
│   ├── code_runner.py     real gcc / python3 execution
│   ├── lexer_parser.py    raw compiler text → tokens/symbols/IR
│   ├── tree_builder.py    derivation tree
│   ├── python_analyzer.py Python pipeline (tokenize + ast)
│   ├── contract.py        shared response schema + language const
│   ├── wsgi.py            production entrypoint (Waitress)
│   ├── requirements.txt   pinned Python deps
│   ├── README.md
│   └── tests/             ★ 60 pytest tests
│
├── compiler/          ★ native C compiler (Lex/Yacc → binary)
│   ├── lexer.l            lexical spec (token patterns)
│   ├── parser.y           bison grammar (parse + semantic + IR)
│   ├── Makefile           builds ./compiler
│   ├── input*.c           sample C programs
│   ├── Images/            grammar/symbol-tree diagrams
│   ├── Part 1-6/          step-by-step build tutorial folders
│   ├── archive/           prior parser experiments v1–v8
│   └── README.md
│
├── frontend/         ★ build + test tooling for the single-file IDE
│   ├── index.html        the IDE (build source; copies into dist/)
│   ├── vite.config.ts    Vite build → dist/
│   ├── package.json      Vite + Playwright only
│   ├── tsconfig.json
│   ├── alive_audit.mjs   live compile+run audit (C/Python + pseudo-C fallback)
│   ├── deep_audit.mjs    deep feature audit (search/outline/minimap/debugger/problems)
│   ├── feat_audit.mjs    feature audit (menus, commands, theme, palette, panels)
│   ├── README.md
│   └── e2e/              ★ 14 Playwright tests (real browser)
│
├── venv/                      local Python venv (generated, not committed)
└── .github/workflows/ci.yml    CI runs make test on push
```

> ★ = most important for the showcase — everything else supports these directly.

---

## 3. How to RUN it (the 3 commands that matter)

```bash
# 1) One-shot setup  (venv + pip + npm deps + C compiler binary)
make setup
make                 # builds the C compiler → compiler/compiler

# 2) Run
make run             # → open http://localhost:5000
make run-prod        # production (Waitress, debug off)

# 3) Test
make test            # backend pytest + Playwright E2E
```

Or run pieces directly:

```bash
# backend tests only
venv/bin/python -m pytest backend/tests -q

# frontend build only
cd frontend && npm run build

# e2e only
cd frontend && npx playwright test --config e2e/playwright.config.ts
```

---

## 4. How to TEST / VERIFY it works

```bash
make test
```

| Suite   | Command                                                       | Count | What it checks                                    |
|--------|----------------------------------------------------------|-----|--------------------------------------------------|
| Backend| `venv/bin/python -m pytest backend/tests -q`              | 60 | token goldens, precedence, semantic errors, schema, security |
| E2E    | `cd frontend && npx playwright test --config e2e/playwright.config.ts` | 14 | real browser: compile, panels, terminal, SC-010 |
| Live   | `node frontend/alive_audit.mjs`                           | 27    | in-browser compile+run, C/Python + pseudo-C fallback |
| Live   | `node frontend/deep_audit.mjs`                            | 14    | search, outline+line numbers, minimap, debugger, problems, datatype classification |
| Live   | `node frontend/feat_audit.mjs`                            | 26    | menus, commands, theme, palette, panels           |
| Status | `curl http://localhost:5000/api/status`                  | —     | compiler binary found + languages ready |

The live audit scripts drive a real browser (Playwright) against `http://localhost:5000` —
start the server with `make run` first, then run each script from the `frontend/` directory.

`make lint` runs `ruff check backend`; `make check` = lint + test.

---

## 5. Live showcase script (60 seconds)

1. `make run → http://localhost:5000`
2. In the IDE → pick **main.c** in the explorer.
2. Click **▶ Run Compiler** — watch all 8 panels populate: tokens, symbols, parse, IR, opt, debug, insights, problems.
3. Open the **terminal** (`#abt`) → type `run` → press Enter → the program really executes (C: prints x/y/z; Python: prints "Hello, World! / 30").
4. Toggle **theme**, open the **command palette** (`Ctrl+Shift+P`).

Everything is local and deterministic — no internet needed.

---

## 6. Where to look, by goal

| I want to…                                                     | Open this                                             |
|----------------------------------------------------------------|-------------------------------------------------------|
| See the IDE UI                                               | `index.html` (or run, hit /)                          |
| Understand the API contract                                  | `backend/contract.py`                                  |
| Change a backend endpoint                                   | `backend/app.py`                                     |
| Add a Python-language feature                                | `backend/python_analyzer.py`                        |
| Add a C-language feature                                     | `compiler/parser.y` + `compiler/lexer.l`           |
| Change how compilation is rendered in the IDE               | `index.html` (the render logic + panel drawing)     |
| Add/change an E2E test                                      | `frontend/e2e/`                                    |
| Add/change a backend test                                   | `backend/tests/`                                    |
| Understand the whole build                                  | `Makefile`                                          |

---

## 7. Mental model

The **Makefile** is the single source of truth that orchestrates every build/test/run target.
Keep it in sync with any new scripts. The **frontend** needs a build → `dist/` before Flask
serves anything, and a compiler binary must exist before C compilation reports "ready".

**Broken?** Run `make clean && make setup && make && make test` to prove the whole repo builds
green from nothing.