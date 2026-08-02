# CompileViz IDE

A VS Code–style, browser-based **compiler-construction visualizer**. Paste a real C or Python
program and watch the whole pipeline — **Lexical → Syntax (Parsing) → Semantic → Intermediate
Code (IR)** — run end-to-end, with every phase visualized and explained. Built as a university
teaching tool: output is deterministic, canonical, and accurate **within a bounded, testable
language subset**.

## Features

- Four-phase pipeline visualization for **C** (Lex/Yacc/GCC) and **Python** (stdlib `ast`/`tokenize`)
- VS Code–like IDE: activity bar, file explorer, editor (CodeMirror 6), bottom panel
  (Tokens / IR / Diagnostics) and right panel (Phase Flow / Parse Tree / Symbol Table)
- Tier 1 & Tier 2 autocomplete (keywords + declared symbols) — fully local, no network
- Sortable symbol table, collapsible parse tree, exact line/col diagnostics
- Reproducible build (`make clean && make`) with pinned toolchains

## Requirements

- **Python 3.12** (backend + stdlib `ast`)
- **Lex / Yacc / GCC** (C core)
- **Node 24 / npm 11** (frontend, `make setup` installs via `npm ci`)

## Quickstart

```bash
make setup          # venv + pip deps + frontend deps (npm ci)
make                # build the C compiler binary
make run            # start the Flask server → http://localhost:5000
make test           # pytest + vitest (frontend) + playwright (E2E)
```

- Open the served SPA in a browser, pick a sample from the Explorer, then press **▶ Run**
  or **Ctrl+Enter**.
- `make run-prod` serves the app under a production WSGI server (`debug=False`).

## Build ground truth

- `compiler/Makefile` is the **single source of truth** for the C build:
  `lex lexer.l; yacc -d -v parser.y; gcc -w -o compiler y.tab.c`.
  Note: **do not use `gcc -ll`** — it links `libl`'s own `main` and fails on modern toolchains
  (`yyerror`/`yywrap` are defined in-project).
- The compiler binary reads source from **stdin** (`./compiler < file`).
- Generated files (`y.tab.c`, `lex.yy.c`, `y.output`, `a.out`, `compiler`) are gitignored.

## Architecture

```
compiler/   C pipeline: lexer.l (Lex) + parser.y (Yacc) → 4-phase text output (PHASE 1-4)
backend/    Flask service: /api/compile, /api/tokenize, /api/status; contract.py schema;
            compiler_runner (stdin, resource caps, 1 MB output cap); lexer_parser + tree_builder
frontend/   TypeScript + CodeMirror 6 + Vite SPA (store-driven, vanilla DOM)
specs/      Feature docs: spec.md (FR-001…FR-059, SC-001…SC-010), plan.md, tasks.md
history/    Prompt History Records (PHR)
```

## Supported language subset

The accuracy contract lives in `specs/001-project-foundation/spec.md` §5.9 — a sample is
**valid iff it is inside the supported subset**; every out-of-subset construct must produce a
clear diagnostic, never a silent miscompile.

## Tests

- `backend/tests/` — pytest (pipeline, semantics, subset boundary, edge cases, golden output)
- `frontend/tests/` — vitest (client transport, autocomplete, explorer, symbol table)
- `e2e/` — Playwright (user workflows + SC-010 ≤2 s render budget)
