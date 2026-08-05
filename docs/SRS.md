# CompileViz IDE — Software Requirements Specification (SRS)

| | |
|---|---|
| **Document ID** | SRS-CompileViz-001 |
| **Version** | 1.0.0 |
| **Status** | Approved |
| **Last Updated** | 2026-08-06 |
| **Product** | CompileViz IDE — Multi-Language Compiler Visualizer |
| **Category** | Compiler-Construction Educational Web Application |
| **Doc Structure** | IEEE 830-1998 / IEEE 29148-2018 practices |
| **Companion docs** | [README](../README.md) · [Project Guide](GUIDE.md) · [Feature Spec](../specs/001-project-foundation/spec.md) |

---

<div align="center">

![CompileViz IDE — main window](screenshot-app.png)

</div>

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [System Architecture](#3-system-architecture)
4. [Functional Requirements](#4-functional-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [Data Model & Contracts](#6-data-model--contracts)
7. [Supported Language Subset](#7-supported-language-subset)
8. [Key Entities](#8-key-entities)
9. [Edge Cases & Error Handling](#9-edge-cases--error-handling)
10. [Success Criteria](#10-success-criteria)
11. [Test Plan & Verification](#11-test-plan--verification)
12. [Constraints, Assumptions & Dependencies](#12-constraints-assumptions--dependencies)
13. [Out of Scope](#13-out-of-scope)
14. [Glossary](#14-glossary)
15. [Appendix — Requirement Traceability](#15-appendix--requirement-traceability)

---

# 1. Introduction

## 1.1 Product Purpose

**CompileViz** is a browser-based, VS Code–style Integrated Development Environment (IDE) for
**learning compiler construction**. It lets a user write or paste real **C** and **Python**
programs and watch the complete compilation pipeline — **Lexical → Syntax → Semantic →
Intermediate Code (IR)** — run end-to-end, with every phase visualized, categorized, and
explained. It can also **really execute** supported programs in an integrated terminal
(`gcc` for C, `python3` for Python).

The product must be **100% accurate** in every phase it claims to support, and production-ready
enough to be offered to universities as a classroom teaching tool.

## 1.2 Document Purpose

This SRS is the single authoritative statement of what CompileViz is, why it was built, its
scope, and how its behavior is defined and verified. It is the contract between the product
owner, engineering, QA, and end users.

## 1.3 Scope

**In scope:**
- A multi-language (C and Python) compiler visualizer in a single-page IDE.
- The classic 4-phase pipeline, each phase visualized in its own panel.
- Real execution of supported programs in an interactive terminal.
- A production-hardened backend with a strict error model and security posture.
- Full automated testing (unit, integration, browser E2E) plus continuous integration.

**Out of scope** (see §13): AI/LLM autocomplete, additional languages, remote collaboration,
and full-fidelity runtime execution beyond the bounded subset.

## 1.4 Intended Audience

| Actor | Need |
|-------|------|
| **University students** | Learn each compiler phase by watching real code traverse the pipeline with accurate, explained output. |
| **Instructors / lecturers** | Demonstrate the textbook compiler pipeline live; compare C vs. Python in one tool. |
| **Developers / hobbyists** | Explore how compilation and execution work for small bounded programs. |

## 1.5 Intended Use

1. Paste or edit a C or Python program in a real-IDE editor.
2. Click **Run Compiler** to visualize all four phases.
3. Click **Execute** to really compile and run the program in the terminal.
4. Inspect diagnostics with precise line/column positions.
5. Use Tier-1 / Tier-2 context-aware autocomplete while typing.

## 1.6 Delivery Roadmap

This SRS consolidates requirements delivered in ordered, gated phases (each green before the
next began):

| Phase | Scope |
|-------|-------|
| **P0** | Harden the foundation; add baseline test harness. |
| **P1** | C: full 4-phase accuracy + symbol table + tests. |
| **P2** | Python: tokenize / parse / build symbol table / IR + tests. |
| **P3** | Unified multi-language pipeline, tested together. |
| **P4** | Tier 1 & Tier 2 autocompletion (symbol-table driven). |
| **P5** | UI/UX polish, robust diagnostics, full browser E2E suite. |

## 1.7 Conventions

- **Shall / Must** — mandatory requirement to be implemented.
- **Should** — recommended; satisfied unless a documented reason exists.
- **Priority** — labeled **P1** (core) or **P2** (quality); every requirement carries one.
- Identifiers: **FR** (functional), **SC** (success criterion), **NFR** (non-functional).

---

# 2. Overall Description

## 2.1 Product Perspective

CompileViz replaces an earlier single-language, lightly-tested prototype. It is now a
three-layer system:

1. **Frontend** — a single-file browser IDE (`index.html`).
2. **Backend** — a Python Flask JSON API (`backend/`).
3. **Compiler core** — a hand-written Lex/Yacc/GCC C compiler (`compiler/`) plus CPython's own
   `ast` parser for the Python phase.

## 2.2 Product Functions

- **Compile** C or Python through all four phases and return one canonical JSON result.
- **Visualize** tokens, parse tree, symbol table, IR, problems, and insights.
- **Execute** supported programs in a real terminal.
- **Autocomplete** (Tier 1 keywords + Tier 2 declared symbols), fully local & deterministic.
- **Serve** the IDE as a static single-page app with a production WSGI server.
- **Harden** against untrusted input (timeouts, resource caps, isolation, no shell).

## 2.3 User Characteristics

Users can write or recognize basic C or Python. The IDE is self-explaining; at runtime only a
browser is needed.

## 2.4 Operating Environment

| Layer | Environment |
|-------|-------------|
| Browser | Modern evergreen: Chromium, Firefox, Safari, Edge; JavaScript enabled. |
| Server | Python 3.12 on Linux/macOS (Unix-like), with flex/bison/gcc for C. |
| Build/Dev | Node 24 + npm; Vite; Playwright; ruff; pytest. |
| Deploy | Flask dev or Waitress production on port 5000; static `dist/` SPA. |

## 2.5 Design Constraints

- **Accuracy over convenience** — correctness within the subset is non-negotiable.
- **Backend must be Python** to bind CPython's own `ast` parser for accurate Python analysis.
- **Determinism** — same input yields byte-identical output, every run.
- **Unix-like** environment for Makefile and scripts.

## 2.6 Assumptions

- Flask server runs on port 5000.
- The C compiler binary is named `compiler` (fallback `a.out`).
- Python stdlib `ast`/`tokenize` available.
- Local `venv/` and `node_modules/` present after `make setup`.
- The project targets Linux/macOS.

## 2.7 Dependencies

- **Backend**: Flask, Flask-CORS, Waitress; stdlib `subprocess`, `tempfile`, `resource`, `ast`, `tokenize`.
- **Native C**: flex, bison/yacc, gcc.
- **Frontend (build/test)**: Vite, Playwright; zero runtime dependencies (single-file IDE).

---

# 3. System Architecture

CompileViz is a **hybrid** client/server system. The browser ships a complete, self-contained
compilation engine (lexer, parser, semantic/type checker, three-address IR generator, optimizer,
and a step-debuggable VM) that is the **primary engine**, so the IDE renders every analysis panel
instantly, offline, with deterministic data. The Flask backend hosts the **real** native pipeline
(C via `compiler/`, Python via stdlib `ast`) and real code execution; when the server is reachable,
`run` routes to genuine `gcc`/`python3` execution and a `backend` command surfaces the real
pipeline's tokens/IR/errors. The in-browser engine and the backend are **two cooperating engines**
with a fallback so the demo never breaks.

```
┌────────────────────────────────────────────────────────────────────────────┐
│                     BROWSER  (single-file IDE, index.html)                 │
│   PRIMARY ENGINE (in JavaScript, runs every time):                         │
│     tokenize → buildSym → parse → typeCheck → genIR → optimize → makeVM    │
│   panels: tokens · symbols · parse · ir · opt · debug(VM) · insights       │
│   + terminal (run → real backend when online, VM fallback otherwise)       │
└───────────────────────────────┬────────────────────────────────────────────┘
                                │  HTTP (JSON) — best-effort, offline-safe
┌───────────────────────────────▼────────────────────────────────────────────┐
│                   Flask BACKEND (Python)                        backend/   │
│   /api/status · /api/run · /api/compile · /api/tokenize                   │
│   lexer_parser · tree_builder · python_analyzer · code_runner · contract  │
└───────────────────────────────┬────────────────────────────────────────────┘
                                │  stdin → stdout (bounded, timed, capped)
┌───────────────────────────────▼────────────────────────────────────────────┐
│                  NATIVE COMPILER (Lex/Yacc/gcc)   compiler/                │
│   lexer.l + parser.y  →  PHASE 0–4 text output                             │
└────────────────────────────────────────────────────────────────────────────┘
```

**Analysis pipeline (in-browser, always-on):** every compilation runs the single-file JS engine
first: `tokenize()` → `buildSym()` → `parse()` → `typeCheck()` → `genIR()` → `optimize()` →
`makeVM()`. These populate the Tokens, Symbols, Parse Tree, IR, Optimizer, Debug (VM), Insights,
and Problems panels, plus the status bar counts. This path needs no server and is the source of
truth for the interactive panels.

**Backend probe (best-effort):** on load the IDE pings `GET /api/status`. If the Flask server
answers `running`, the status bar switches to `⚡ backend: online` and `Run` becomes a **real**
execution:

**Execute flow (`runProg`, hybrid, auto-fallback):**
1. If backend online, `POST /api/run {code, language}` → `code_runner.py` invokes real tooling
   (`gcc -Wall`/`./main` for C, `python3` for Python), streaming output, exit code, and errors.
2. If the backend is offline OR rejects the code as invalid real C (e.g. pseudo-C samples without `main`), the IDE
   falls back to the in-browser VM (`runVM()`), which still prints `[state]` and an exit code — the
   demo never breaks offline.
3. The `backend` (terminal) command runs a real `POST /api/compile` and prints the backend's token count,
   symbol table size, IR, and errors; any backend errors are merged into the Problems panel.

**Real backend compile request flow (C):** `POST /api/compile {code, language:"c"}` → lock →
`compiler/compiler` via stdin in a capped temp dir → `lexer_parser.py` → `tree_builder.py` → one
canonical `CompileResponse`.

**Compile request flow (Python):** `language:"python"` → `python_analyzer.py` (stdlib `tokenize` +
`ast`) building tokens/symbols/IR with the same schema.

---

# 4. Functional Requirements

## 4.1 Compiler Pipeline — C

| ID | Priority | Requirement |
|----|----------|-------------|
| FR-001 | P1 | Correctly tokenize all valid C programs in the subset (nested `for`, `if/else`, `printf`, `scanf`, arithmetic). |
| FR-002 | P1 | Produce a correct parse tree (derivation/inorder); **operator precedence and associativity must match C** (`* / %` bind tighter than `+ -`; relational tighter than logical `&& \|\|`; assignment right-associative). A mis-associated expression is a miscompile and a P1 defect. |
| FR-003 | P1 | Perform semantics: declaration-before-use, duplicate declarations, return-type checks, type conversions. |
| FR-004 | P1 | Generate correct three-address IR, including explicit conversion instructions and explicit labels/temporaries/control flow. |
| FR-005 | P1 | Report errors with correct line numbers and descriptive messages. |
| FR-006 | P1 | Emit output in a shared, parsable, section-delimited format used by the backend. |

## 4.2 Compiler Pipeline — Python

| ID | Priority | Requirement |
|----|----------|-------------|
| FR-007 | P1 | Tokenize valid Python: indentation blocks, imports, functions, arithmetic. |
| FR-008 | P1 | Build a parse tree using the Python `ast` module. |
| FR-009 | P1 | Build a symbol table (functions/variables, scope and type where statically known). |
| FR-010 | P1 | Produce a three-address IR-like representation for supported constructs. |
| FR-011 | P1 | Report syntax errors and a limited set of static semantic issues with line numbers. |
| FR-012 | P1 | Emit output using the same section-header format as the C pipeline. |

## 4.3 Backend API — Compile & Status

| ID | Priority | Requirement |
|----|----------|-------------|
| FR-013 | P1 | `/api/compile` accepts `{ code, language }` where `language` is `c` or `python`. |
| FR-014 | P1 | Routes to the correct pipeline based on `language`. |
| FR-015 | P1 | Response includes `success, language, tokens, parse_tree, symbol_table, ir_code, errors, warnings, phases, raw_output`. |
| FR-016 | P1 | Every error includes `level, message, line, col`; **line/col must point at the triggering token**, verified by a test asserting the exact position. |
| FR-017 | P1 | `/api/tokenize` returns tokens even when the full pipeline fails. |
| FR-018 | P1 | `/api/status` reports per-language backend readiness. |
| FR-019 | P1 | Enforce a 10-second timeout per compilation. |
| FR-020 | P1 | Clean up temporary files after each compilation. |

## 4.4 Backend API — Error Model & HTTP Status

| ID | Priority | Requirement |
|----|----------|-------------|
| FR-021 | P1 | `200` on success; `400` for malformed/unprocessable requests. |
| FR-022 | P1 | `504` on timeout at the 10-second limit, with a clear timeout error body. |
| FR-023 | P1 | `502` when a required backend is unavailable (binary missing / server down), with an instructional message. |
| FR-024 | P1 | Never crash on empty/non-C/Python input; return `200` + `success:false` + keyword diagnostics so the frontend renders empty state. |

## 4.5 Auto-completion (Tier 1 & Tier 2)

| ID | Priority | Requirement |
|----|----------|-------------|
| FR-025 | P1 | Tier-1 keyword completion for the active language. |
| FR-026 | P1 | Tier-2 symbol completion sourced from the symbol table. |
| FR-027 | P1 | Trigger on typing, dropdown at the cursor, accept via Enter/Tab. |
| FR-028 | P1 | Fully deterministic and local — no network/API calls (no Tier 3). |
| FR-029 | P1 | Supports both C and Python (keyword/symbol set selected per language). |

## 4.6 Frontend IDE

| ID | Priority | Requirement |
|----|----------|-------------|
| FR-030 | P1 | VS Code-like layout: title bar, activity bar, explorer, editor, bottom/right panels, status bar. |
| FR-031 | P1 | Status bar shows the active language and a C/Python selector. |
| FR-032 | P1 | Editor with syntax highlighting, line numbers, bracket matching, auto-close. |
| FR-033 | P1 | `Ctrl+Enter` runs compilation. |
| FR-034 | P1 | Run button shows a loading state while compiling. |
| FR-035 | P1 | Phase-flow panel with animated phase indicators (Waiting → Running → Done → Error). |
| FR-036 | P1 | Tokens panel color-codes tokens by type with line numbers. |
| FR-037 | P1 | Parse Tree panel shows a collapsible tree equal to the parser's derivation tree (with semantic annotations), never a fabricated tree. |
| FR-038 | P1 | Symbol Table panel is sortable with name/type/scope/value/line; **value is the compile-time constant initializer or `null`** (never a guessed value). |
| FR-039 | P1 | IR Code panel shows three-address code with line numbers and highlighting. |
| FR-040 | P1 | Diagnostics panel shows errors/warnings with severity icons, line numbers, colors. |
| FR-041 | P1 | File explorer loads C and Python samples. |
| FR-042 | P1 | Empty-state messages shown before any run. |
| FR-043 | P1 | Toast on compile success/failure. |
| FR-044 | P1 | Handle connection errors gracefully (server down / binary missing). |

## 4.7 Frontend Build & Deployment

| ID | Priority | Requirement |
|----|----------|-------------|
| FR-045 | P1 | Frontend build (Vite) produces a deterministic static bundle. |
| FR-046 | P1 | Flask serves the built SPA and routes unknown routes to `index.html`. |
| FR-047 | P2 | Build reproducible from a clean checkout with pinned/documented tooling. |

## 4.8 Build & Deployment (repo-level)

| ID | Priority | Requirement |
|----|----------|-------------|
| FR-048 | P1 | Root `Makefile` provides `all`, `setup`, `run`, `test`, `clean`. |
| FR-049 | P1 | `compiler/Makefile` runs `lex`, `yacc`, `gcc` to produce the C compiler binary. |
| FR-050 | P1 | `make setup` creates a venv, installs Python deps, and installs pinned frontend tooling. |
| FR-051 | P1 | `make run` builds the frontend (if needed) and starts the server. |
| FR-052 | P1 | `make test` runs all automated tests (C, Python, integration, E2E). |
| FR-053 | P1 | `make clean` removes all generated files. |
| FR-054 | P1 | Root README includes description, usage, build instructions, screenshots. |
| FR-055 | P1 | `make run-prod` serves the SPA under a production WSGI server with `debug=False`. |
| FR-056 | P1 | CORS restricted to serving origin(s) and proper security headers (never a wildcard). |
| FR-057 | P1 | CI runs `make test` on push/PR after a clean bootstrap. |
| FR-058 | P1 | Concurrency guard and request-body size bound so subprocess execution cannot be abused. |

## 4.9 Sample Program Catalog

| ID | Priority | Requirement |
|----|----------|-------------|
| FR-059 | P1 | Ship a catalog of samples (`hello.c`, `arithmetic.c`, `factorial.c`, `input1.c`, `input2.c`, `input3.c`, `test.c`, `hello.py`, `functions.py`); **every sample must be inside the §7 subset** — a sample the pipeline cannot fully process is a P1 defect. |

---

# 5. Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-01 | Performance | All 4 phase outputs render within **2 seconds** of clicking Run for any in-subset sample (SC-010). |
| NFR-02 | Performance | UI stays responsive (non-freezing, virtualized) at the large-file boundary (5,000+ tokens / 2,000+ lines). |
| NFR-03 | Reliability | No crash for any input, including empty, very large, or non-C/Python content. |
| NFR-04 | Determinism | Same input → byte-identical output every run, every phase. |
| NFR-05 | Security | Untrusted input handled safely: no shell interpolation; resource limits; isolated temp dirs with cleanup. |
| NFR-06 | Correctness | Within the supported subset, output is 100% accurate for every phase. |
| NFR-07 | Concurrency | At most one subprocess operation in flight (guard → `429` when busy). |
| NFR-08 | Availability | `/api/status` accurately reports server + per-language readiness. |
| NFR-09 | Portability | Unix-like; runs on Linux and macOS. |
| NFR-10 | Testability | Full pipeline covered by automated unit, integration, and E2E tests. |

---

# 6. Data Model & Contracts

## 6.1 Compile Request

```json
{ "code": "int main() { int x = 10; return 0; }", "language": "c" }
```

## 6.2 Compile Response (canonical — identical shape for both languages)

```json
{
  "success": true,
  "language": "c",
  "tokens":      [ { "token": "int", "class": "DATATYPE", "line": 1, "col": 5 } ],
  "parse_tree":  { "label": "Program", "cls": "tl-prog", "children": [] },
  "symbol_table":[ { "name": "x", "type": "int", "scope": "global", "value": "10", "line": 1 } ],
  "ir_code":     [ { "op": "assign", "arg1": null, "arg2": null, "result": "x", "label": null, "line": 1 } ],
  "errors":      [ { "level": "error", "message": "", "line": 0, "col": 0 } ],
  "warnings":    [],
  "phases":      { "lexer": "done", "parser": "done", "semantic": "done", "irgen": "done" },
  "raw_output":  ""
}
```

## 6.3 Token Objects

```json
{ "token": "...", "class": "IDENTIFIER | KEYWORD | NUMBER | STRING | OPERATOR | PUNCTUATION | DATATYPE | DELIMITER | COMMENT | NEWLINE | INDENT | DEDENT", "line": 1, "col": 0 }
```

## 6.4 Diagnostic Objects

```json
{ "level": "error | warning", "message": "...", "line": 1, "col": 2 }
```

## 6.5 Phase States

`waiting | running | done | error` for each of `lexer`, `parser`, `semantic`, `irgen`.

---

# 7. Supported Language Subset

The subset below is the exact contract for "100% accuracy": a sample is **valid iff it is
inside this subset**; every out-of-subset construct must produce a **clear diagnostic — never
a silent miscompile**.

## 7.1 C Subset (must compile + render all 4 phases)

- **Structure:** optional `#include` section followed by exactly one `main()` with no
  parameters. Programs without headers are valid.
- **Declarations:** `int`, `char`, `float`; single and multiple variables per statement; initializers.
- **Expressions:** arithmetic (`+ - * / %`), relational (`< <= > >= == !=`), logical (`&& || !`),
  assignment (`=`), increment/decrement (`++ --`), parentheses, integer/float/char literals,
  identifiers — with C-standard precedence/associativity (FR-002).
- **Statements:** expression, `if`/`else`, `while`, `for`, `do-while`, `return`, `break`, `continue`.
- **Calls:** fixed forms `printf("<string>");` and `scanf("<string>", &id);` only.
- **Comments:** `//` and `/* */` with correct line tracking across multi-line block comments.

**Explicitly not supported → clear unsupported-feature error, never miscompile:**
`struct`, `union`, `enum`, `typedef`, `#define` bodies, pointers `*`, arrays `[]`, `switch`/`case`/`goto`,
`static`/`extern`, `double`, string literals outside the fixed `printf`/`scanf` forms, nested or
user-defined/variadic/recursive functions, `const`/`volatile`, multi-scope shadowed identifiers,
octal/hex literals, `unsigned`/`long`/`short`.

## 7.2 Python Subset (must analyze correctly)

- **Tokens:** identifiers, numbers, strings, operators, indentation-produced `NEWLINE`/`INDENT`/`DEDENT`.
- **Statements:** `def`, `return`, `if`/`elif`/`else`, `while`, `for ... in`, `break`, `continue`,
  `import` (module-level), assignment, arithmetic/comparison/logical expressions, `print`.
- **Types:** recorded when statically determinable (int/float/str from literals), including
  optional type hints (`def f(x: int) -> str:`, `x: int = 5`).

**Explicitly not supported (clear error or documented static warning):** full cross-module name
resolution, classes, decorators, comprehensions, lambdas, generators, `async`/`await`, `yield`,
`with`, `try`/`except`, f-strings (tokenized but flagged), dynamic type inference beyond literals.

---

# 8. Key Entities

- **C Compiler Pipeline** — lexer → parser → semantic → IR via the Lex/Yacc/GCC binary.
- **Python Analysis Pipeline** — tokenizer → `ast` → symbol table → IR (in-process Python).
- **Unified Compile Runner** — dispatches by `language` and returns one canonical response.
- **API Contract** — `{ code, language }` ⇒ the §6.2 response.
- **Output Protocol** — shared section headers across C and Python for the backend parser.
- **Symbol Table** — source of truth for Tier-2 completion and the Symbol Table panel.
- **Autocomplete Tiers** — Tier 1 = keywords; Tier 2 = symbol table; Tier 3 (AI) deferred.
- **IDE State** — editor content, active language, active tabs, compile results, phase states.
- **Supported Language Subset** — the exact §7 contract driving testability and accuracy.

---

# 9. Edge Cases & Error Handling

| Scenario | Expected behavior |
|----------|-------------------|
| Empty program (either language) | Handled with empty state; `200` + `success:false`. |
| Undeclared variable / duplicate declaration | Semantic error with the correct line. |
| Return-type mismatch / syntax error | Parser or semantic error with the correct line. |
| Python: unclosed string / bad indentation / out-of-scope name | Clear, line-numbered error. |
| Missing compiler binary | "Compiler binary not found. Run `make` in compiler/ folder." |
| Server not running | "Cannot reach Flask server…" clear user-facing message. |
| Compile timeout (10 s) | `504` with a clear timeout message. |
| Unsupported construct | Clear diagnostic — never a silent miscompile. |
| Very large C/Python file | Non-freezing, virtualized rendering at the defined boundary. |
| Non-C/non-Python content | Appropriate syntax errors; never a crash. |
| Concurrent compile while busy | `429` "Another compilation is in progress." |

---

# 10. Success Criteria

| ID | Criterion |
|----|-----------|
| SC-001 | A new user can clone, run `make`, open the IDE, pick C or Python, paste a program, click Run, and see 4 non-empty correct phase outputs in under 5 minutes. |
| SC-002 | `make test` passes with 0 failures for all samples and edge cases. |
| SC-003 | C pipeline is correct for 100% of in-subset samples; every unsupported construct yields a clear diagnostic. |
| SC-004 | Python pipeline is correct for 100% of in-subset samples; every unsupported construct yields a clear diagnostic. |
| SC-005 | C and Python compile correctly in the same session; regression suite covers both. |
| SC-006 | Autocomplete (Tier 1 & Tier 2) works in both languages and never uses the network. |
| SC-007 | The IDE handles every error case (invalid code, missing binary, server down) without crashing. |
| SC-008 | All user stories are independently testable and pass. |
| SC-009 | `make clean && make` rebuilds the entire project from scratch. |
| SC-010 | For any in-subset input in either language, all 4 phase outputs render within 2 s of clicking Run (verified by E2E). |

---

# 11. Test Plan & Verification

The project's test strategy is driven by the root `Makefile` and is fully automated.

| Tier | Command | Coverage |
|------|---------|----------|
| Backend unit/integration (60) | `venv/bin/python -m pytest backend/tests -q` | token goldens, precedence/associativity, semantic errors, subset boundary, output fidelity, schema parity, security hardening, catalog gate, Python type-hinting, edge cases |
| E2E browser (14) | `cd frontend && npx playwright test --config e2e/playwright.config.ts` | real browser: title/panels, every sample compiles, tabs/buttons/toggles, resizable panels, token count, real C & Python execution, terminal shell commands, SC-010 timing |
| Lint | `make lint` → `ruff check backend` | static Python quality |
| Check | `make check` = lint + test | full gate |
| CI | `.github/workflows/ci.yml` | `make test` on push/PR from a clean bootstrap |

**Live verification (final hardening pass):** C and Python both compile with **0 errors**, all
8 panels populate, and both run in the terminal correctly (C prints `x/y/z`, exit 0; Python
prints `Hello, World!` and `30`). Test suite: **60 pytest + 14 Playwright E2E — all passing**.

---

# 12. Constraints, Assumptions & Dependencies

- **Required toolchains:** Python 3.12, Node 24, flex, bison/yacc, gcc (Unix-like).
- **Runtime:** Flask on port 5000; C binary `compiler/compiler` built by `make`.
- **Design constraint:** backend must remain Python to bind CPython's `ast` (accuracy).
- **Dependencies:** Flask, Flask-CORS, Waitress (backend); Vite + Playwright (frontend tooling).
- **Assumptions:** Linux/macOS; static SPA delivery; stdlib `ast`/`tokenize` present.

---

# 13. Out of Scope

- **Tier 3 (AI/LLM) autocomplete** — explicitly excluded; deterministic Tier 1 & Tier 2 only.
- **Additional languages** (C++, Java, Go, Rust) — future separate specs.
- **Remote / multi-user collaboration.**
- **Full-fidelity compiled program execution** — the tool visualizes compilation; execution
  is limited to the supported subset via the terminal.

---

# 14. Glossary

| Term | Definition |
|------|-----------|
| Token | Smallest lexical unit, e.g., `DATATYPE int`, `IDENTIFIER x`, `OPERATOR =`, `NUMBER 5`, `DELIMITER ;`. |
| Parse / derivation tree | The grammar-derivation tree produced by the parser, shown collapsible in the IDE. |
| Symbol table | Categorized registry of declared identifiers and their type/scope/value/line. |
| Three-address IR | Intermediate representation using explicit temporaries, labels, and control flow. |
| Compiler phases | Lexical → Syntax (Parsing) → Semantic → IR Generation. |
| Tier-1 autocomplete | Keyword/control-word completion. |
| Tier-2 autocomplete | Declared-symbol completion from the symbol table. |
| SPA | Single-page application. |
| Subset | The bounded language constructs the compiler must handle 100% accurately (§7). |

---

# 15. Appendix — Requirement Traceability

| Requirement | Implementation | Verified by |
|-------------|----------------|-------------|
| FR-001 … FR-006 (C pipeline) | `compiler/lexer.l`, `compiler/parser.y`, `backend/lexer_parser.py` | `backend/tests/test_c_*.py`, `test_golden.py` |
| FR-007 … FR-012 (Python pipeline) | `backend/python_analyzer.py` | `backend/tests/test_python_*.py` |
| FR-013 … FR-024 (API + error model) | `backend/app.py`, `backend/contract.py` | `backend/tests/test_smoke.py`, `test_security.py`, `test_schema_parity.py` |
| FR-025 … FR-029 (autocomplete) | `index.html` (IDE completion) | E2E: `frontend/e2e/*.spec.ts` |
| FR-030 … FR-044 (IDE) | `index.html` | E2E: `frontend/e2e/ui.spec.ts` |
| FR-045 … FR-047 (frontend build) | `frontend/vite.config.ts`, `frontend/package.json` | CI build + `make frontend-build` |
| FR-048 … FR-058 (build/CI/security) | `Makefile`, `compiler/Makefile`, `.github/workflows/ci.yml`, `backend/app.py` | `make test`, CI on push/PR |
| FR-059 (catalog) | `index.html` (samples) | `backend/tests/test_catalog.py`, E2E |
| SC-001 … SC-010 | Full system | pytest + Playwright E2E + manual acceptance |
| NFR-01 … NFR-10 | Full system | perf/security/reliability tests + E2E SC-010 |

---

<div align="center"><sub>Documentation is kept in sync with the repository at <code>docs/SRS.md</code>.
Companion docs: <a href="../README.md">README</a> · <a href="GUIDE.md">Project Guide</a> ·
<a href="../specs/001-project-foundation/spec.md">Feature Specification</a>.</sub></div>

*End of SRS — the entire software behavior, data contracts, requirements, criteria, and
verification plan are contained in this document.*