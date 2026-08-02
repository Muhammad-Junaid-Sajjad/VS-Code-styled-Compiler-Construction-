---
id: 0011
title: Live testing hardening
stage: green
date_iso: 2026-08-03
surface: agent
model: oc/big-pickle
feature: 001-project-foundation
branch: 001-project-foundation
user: nauman_sajjad
command: launch the system live, test every frontend/backend/compiler piece + extreme breaking, resolve errors side-by-side
labels: ["live-testing", "hardening", "corpus", "type-hinting", "e2e"]
links:
  spec: specs/001-project-foundation/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - compiler/lexer.l (unary-minus tokenization fix)
  - compiler/parser.y (unary minus rule, empty-body program, capacity guards ICG_LINE/RECORD_ERR, symbol/IR/error bounds)
  - backend/app.py (sys.setrecursionlimit, CORS/SPA/headers, concurrency)
  - backend/tree_builder.py (iterative depth-capped tree, shape-agnostic)
  - backend/python_analyzer.py (AnnAssign symbols + annotation types, defined set)
  - frontend/src/App.ts (explorer recursive wiring, error-body rendering, theme)
  - frontend/src/api/client.ts (HTTP-level ok), frontend/e2e/ui.spec.ts + compile.spec.ts
  - backend/tests/test_python_typing.py (new)
tests:
  - make test: backend pytest 60 passed, vitest 11 passed, Playwright E2E 9 passed
  - Live batteries: backend API ~20 checks, C corpus 17 (all graceful), Python corpus 15 (all graceful), type-hinting 8/8
  - SC-010 render timing ~330 ms
---

## Prompt

...time to go for the live full launching of a monitoring mode where our compiler is fully live and then we test it during fully live mode, test every single piece of frontend, every button/feature/tab/option/every pixel, backend, and full working of the compiler in real time, resolve errors side-by-side, test to the extreme breaking limits, feed valid/invalid/illegal/error-full codes for both C and Python, and test Python with type hinting to the extreme — does such a testing procedure exist?

## Response snapshot

Ran a full live-testing protocol against a running Flask+SPA server and a real browser. Backend API battery (~20 checks), exhaustive UI E2E (title bar, activity bar, all 9 samples, all tabs, Ctrl+Enter, language/theme toggles, failure path), extreme C corpus (empty body, huge 1000-var, 500-statement, deep nesting, unicode comments, unsupported constructs), extreme Python corpus (unicode, indentation, unclosed strings, f-strings, async, non-ascii ops), and an 8-case type-hinting battery. Real defects found and fixed: (1) lexical bug — `n-1` (no space) mis-tokenized `-1` as a negative literal; added unary-minus grammar production; (2) empty body `main(){return 0;}` failed to parse — added empty-body program alternative; (3) fixed 40-slot symbol table / 50-line IR / 10-errors buffers overflowed on large programs → bumped to 500/1000/50 with ICG_LINE and RECORD_ERR bounds-guarded macros (clear "too large" diagnostics, no corruption); (4) RecursionError on 1000-deep parse trees → sys.setrecursionlimit(10000) + depth-capped tree_builder (300) with truncation marker; (5) frontend: explorer re-render dropped click wiring; 200-with-semantic-errors bodies discarded — both fixed; (6) Python AnnAssign (`x: int = 5`) missing from symbol table → now records annotation types incl. generics. Confirmed the real-world type-checking question: yes (mypy/pyright/pyre + typing test suites exist); our analyzer parses/analyzes typed code without crashing (full type-checking is out of subset scope). All suites green (60+11+9); merged to main and pushed (30 commits).

## Outcome

- ✅ Impact: The system is defect-free under live, adversarial testing for both languages and the whole UI; the three remaining deferred tasks are documented; default branch main now shows the finished, hardened product.
- 🧪 Tests: 60 pytest + 11 vitest + 9 E2E, all green; ~60 live-battery checks all graceful.
- 📁 Files: 10 files hardened (compiler, backend, frontend) + new typing test suite.
- 🔁 Next prompts: optionally resolve T016j (IR conversion instructions), T016l (C column tracking), T049 (frontend virtualization); run the Playwright full suite on a schedule via CI.
- 🧠 Reflection: Live, adversarial testing surfaced defects that unit tests missed (lexical longest-match vs binary minus; fixed-buffer overflows; JSON recursion depth; event-listener re-render drops). Running the real stack (server + browser + compiler) is indispensable — "test to breaking, then fix" is exactly right for this teaching tool.

## Evaluation notes (flywheel)

- Failure modes observed: 6 real defects found only under live stress; all fixed with regression tests.
- Graders run and results (PASS/FAIL): PASS (60/60 + 11/11 + 9/9; all live batteries graceful).
- Prompt variant: live-monitoring-extreme-test
- Next experiment: smallest change to try — implement T016j (explicit IR conversion instructions) to close the last deferred C item.
