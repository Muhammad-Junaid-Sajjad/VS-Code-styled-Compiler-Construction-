# Implementation Plan: CompileViz IDE — Production-Ready Multi-Language Compiler Visualizer

**Branch**: `001-project-foundation` | **Date**: 2026-08-02 | **Spec**: `specs/001-project-foundation/spec.md`
**Input**: The full standalone feature specification (`spec.md`) — this plan is the implementation mapping for that entire spec.
**Revision (2026-08-02, U-P1…U-P9):** updated to track the expert-persona spec changes (FR-002 precedence/associativity, optional headers, `double`→unsupported, pinned function-call forms, FR-059 sample catalog, SC-010) and the verified-code audit (HTTP-500 crash, syntax-error segfault, IR-correctness, line/col accuracy). Key changes land in §7 Phase 0/1 and §8.

> This document is **fully self-contained**. It specifies the technical design, data model, API contracts, project structure, phase plan, and verification strategy that implement every requirement (FR-001…FR-059), success criterion (SC-001…SC-010), user story (§4), and edge case (§9) in the feature spec. It intentionally consolidates the research/data-model/contracts/quickstart outputs of the `/sp.plan` workflow into one file.

---

## 1. Summary

**Primary requirement**: Turn CompileViz into a production-ready, multi-language (C and Python) compiler visualizer — a VS Code-like IDE showing all four compiler phases (Lexical, Syntax, Semantic, IR) accurately, with symbol-table-driven Tier 1 & Tier 2 autocomplete, hardened by full automated and browser E2E testing.

**Technical approach (from research & the locked stack):**
- Keep the existing **Lex/Yacc/GCC** C compiler binary as the C pipeline source of truth.
- Add an in-process **Python pipeline** that wraps the stdlib `ast` module (CPython's own parser) for 100% accurate Python analysis.
- Keep the **Python (Flask)** backend as the unified compile runner, adding a `language` field to route C vs. Python and a strict error model.
- Upgrade the **frontend** from a single vanilla `index.html` to a **TypeScript + CodeMirror 6 + Vite** SPA for a real VS Code-like IDE with typed autocomplete.
- Drive correctness by an explicit **supported-language subset contract** (spec §5.9) so "100% accuracy" has a bounded, testable meaning.

**Delivery order:** P0 harden → P1 C+symbol table+test → P2 Python+symbol table+test → P3 test both → P4 Tier 1&2 autocomplete → P5 UI/UX polish + full E2E.

---

## 2. Technical Context

**Language/Version**:
- Frontend: **TypeScript (latest stable, pinned ~5.x)** built with **Vite** and **CodeMirror 6**.
- Backend: **Python 3.12** (existing `venv/`).
- C core: existing **Lex + Yacc + GCC** toolchain (UNIX).

**Primary Dependencies**:
- Backend: `flask`, `flask-cors` (already installed in `venv/`); stdlib `ast`, `tokenize`, `subprocess`, `tempfile`.
- Frontend (pinned in `frontend/package-lock.json`, Node v24/npm 11 available): `typescript@~5.x`, `vite@^5`, `@codemirror/state`, `@codemirror/view`, `@codemirror/lang-c`, `@codemirror/lang-python`, `@codemirror/autocomplete`, plus a minimal UI framework if chosen in the design decision below.
- Testing: backend `pytest` (add to venv); frontend `vitest`; E2E `playwright` (+ `npx playwright install`).

### Build Ground Truth (verified against the repo — MUST-HAVE preconditions)

| Fact | Status (as inspected) | Action |
|------|-----------------------|--------|
| Root `Makefile` | **DOES NOT EXIST** | **Create** in P0 with `all/setup/run/test/clean` + `run-prod/lint/format/check` (FR-048, FR-055) |
| `compiler/Makefile` | **DOES NOT EXIST** | **Create** in P0 from the **verified** recipe: `lex lexer.l; yacc -d -v parser.y; gcc -w -o compiler y.tab.c` (chooses `compiler`, not `a.out`). **Omit `-ll`** — it links `libl`'s own `main` and fails the link; `yyerror`/`yywrap` are defined in-project |
| C binary name | Existing `a.out` present; `_find_binary()` probes `compiler`, `a.out`, `main`, `ccompiler` | Pin the build to emit **`compiler`**; keep `a.out` only as fallback; document this single source of truth |
| Runner invocation contract | `compiler_runner.py` calls binary with the source *file path as argv* AND creates a temp `.c`; the `compiler/README.md` shows `./a.out<input1.c` (stdin) | **Resolve at P0**: a compile test must confirm argv-vs-stdin. If the binary expects stdin, change the runner to feed source via stdin — do not trust the README blindly |
| Backend deps | `flask` + `flask_cors` present in `venv/` | Confirm; add `pytest` (and `pytest-html` optional) |
| Frontend toolchain | Node v24.15 / npm 11.12 present on dev machine | Create `frontend/` with a committed `package-lock.json` for reproducibility |

This table is the authoritative build precondition matrix; it feeds directly into the `/sp.tasks` breakdown and the P0 exit gate.

**Storage**: None — stateless compile service. Temporary files cleaned up after each request.

**Testing**: `pytest` (unit/integration), `vitest` (frontend), `Playwright` (E2E) — note `make test` must run `npx playwright install` for the first E2E run; aggregated by `make test`.

**Target Platform**: Linux/macOS; server + browser SPA.

**Project Type**: Web application (backend + SPA frontend + native C core).

**Performance Goals**: backend response p95 < 500 ms for supported-subset inputs; frontend no interaction-blocking on upgrade; UI stays responsive at the §9 large-file boundary (5,000+ tokens / 2,000+ lines) using virtualized rendering.

**Constraints**: No network/API calls for autocomplete (Tier 1–2 only, deterministic); 10 s compile timeout; temp-file cleanup; reproducible build from clean checkout; single-output-schema across languages; do NOT trust `compiler/README.md` as build truth — the Makefile recipe is the source of truth.

**Security & Robustness (compile service hardening)**: treat submitted code as untrusted; run subprocess under a **timeout + resource cap** (address-space limit), never on the compiler's real cwd, use random temp dirs with strict ownership, and sanitize/limit stdout length; no shell interpolation of user code. (See §7.1 Security section.)

**Scale/Scale**: single-user per session; up to ~5,000–10,000 tokens; sold projectively as a classroom teaching tool.

---

## 3. Constitution Check

> Chapter GATE before design (re‑checked after design: no violations introduced).

Per `.specify/memory/constitution.md` principles (accuracy, small testable change, no invented APIs, sources-of-truth, minimum viable change), this plan:

- **Pass** — Conforms to "Specification is Source of Truth" (Rule 12): the plan is derived verbatim from the spec and the constitution principles.
- **Pass** — No invented APIs: all endpoints and contracts come from spec FR-013…FR-024 and existing `app.py` behavior.
- **Pass** — Justified new complexity: only two additions are new projects/subsystems (TS frontend build, Python AST pipeline) — both directly mandated by the spec's locked stack and user request.
- **Pass** — Minimum viable change: the compiler binary and backend `ast` routing reuse existing modules; no unrelated refactor is planned.

**Complexity tracking** (requested only because two new subsystems are introduced):

| Violation/Addition | Why Needed | Simpler Alternative Rejected Because |
|--------------------|------------|--------------------------------------|
| New TypeScript `frontend/` SPA | Spec's locked stack mandates TS + CodeMirror 6 + Vite for a real IDE and typed autocomplete | Keeping the single `index.html` would violate FR-032/FR-045 and the "VS Code-like" elite-UX bar |
| New in-process Python `ast` analyzer | 100% accurate Python rendering (FR-007…FR-012, SC-004) requires CPython's `ast` | A Node/Rust reimplementation of a Python parser risks accuracy and is rejected by spec §3 |

---

## 4. Project Structure

### 4.1 Documentation (this feature)

```text
specs/001-project-foundation/
├── spec.md                 # Feature spec (standalone source of truth)
├── plan.md                 # This file (/sp.plan output — implementation plan)
└── tasks.md                # /sp.tasks output (testable task breakdown) — NOT created here
```

(Research, contracts, and data-model are consolidated inside this single plan to keep the feature docs standalone, mirroring the spec.)

### 4.2 Source Code (repository)

```text
# Existing (keep)
compiler/                  # Lex/Yacc/GCC C pipeline (lexer.l, parser.y, built binary)
backend/                   # Flask backend (app.py, compiler_runner.py, lexer_parser.py, tree_builder.py)
index.html                 # Existing SPA (to be replaced by frontend/ build)
css/  js/  assets/                  # (absorbed by frontend/ — samples now seeded in samples/)

# New — root Makefile (must be CREATED, does not yet exist)
Makefile                   # all / setup / run / test / clean / run-prod / lint / format / check
compiler/Makefile          # lex -y ; yacc -d -v; gcc -w -o compiler y.tab.c (no -ll)
frontend/
├── package.json           # pinned dependencies + scripts
├── vite.config.ts
├── tsconfig.json
├── index.html             # SPA shell
└── src/
    ├── main.ts
    ├── App.tsx            # VS Code layout shell (vanilla DOM + store subscription)
    ├── api/client.ts      # typed fetch wrapper for /api/*
    ├── types/contract.ts  # TS types mirroring the API response schema
    ├── samples/catalog.ts # sample-program catalog constant (4.4) + canned sources
    ├── components/
    │   ├── Editor.tsx        # CodeMirror 6 wrapper + language mode
    │   ├── Completion.tsx    # autocomplete source (Tier 1 keywords + Tier 2 symbols)
    │   ├── PanelContainer.tsx
    │   ├── panels/Tokens.tsx / ParseTree.tsx / SymbolTable.tsx / IR.tsx / Diagnostics.tsx / PhaseFlow.tsx
    │   ├── Explorer.tsx      # sample file tree
    │   ├── StatusBar.tsx / TitleBar.tsx / ActivityBar.tsx
    │   └── Toast.tsx
    └── state/store.ts      # frontend app state (editor text, language, results, tab, phases)

# New tests
backend/tests/
frontend/tests/   (vitest)
e2e/                                     # Playwright end-to-end
root: Makefile (all/setup/run/test/clean)
```

**Structure Decision**: Use Option 2 (web application) with a dedicated `frontend/` TypeScript SPA plus the existing `backend/` and `compiler/`. The current root-level `index.html`, `css/`, `js/` are absorbed/replaced by `frontend/src` and a Vite build, while the backend serves the built bundle statically. The C core is **extended** in `compiler/` (grammar completeness per §5.9 — precedence/associativity, optional headers, new statements/operators, IR and lexer fixes), never replaced.

### 4.3 Frontend Architecture & State (decision — closes "framework-free" ambiguity)

**Decision: Use a minimal typed state store (`zustand` + TypeScript), not React or "framework-free".** Rationale for the 20-year-automation bar:
- A single shared store (`store.ts`) centralizes editor text, active `language`, active tabs, results, and phase states — the single I/O source of truth.
- `zustand` is lightweight (~1 kB), typed, has no virtual-DOM overhead, and integrates cleanly with CodeMirror 6 views (which are imperative). React would add needless re-render coupling; "framework-free" is indeterminate and un-reproducible.
- The UI shell (Title/Activity/Explorer/Status bars) is simple enough to render with vanilla DOM + the store, driven by a `render()` subscription.

**State shape (in `store.ts`):**
```ts
type Store = {
  language: "c" | "python";
  editorCode: string;
  activeTab: "tokens" | "parseTree" | "symbolTable" | "ir" | "diagnostics" | "phaseFlow";
  result: CompileResponse | null;
  phases: Phases;
  currentFile: string | null;   // sample being edited
  running: boolean;             // Run button loading (FR-034)
  toast: { level: string; text: string } | null;
};
```

**Key bindings and flow contracts (map correct—resolves §6 mapping questions):**
- Editor ↔ Store: CodeMirror `updateListener` writes `editorCode`; `Ctrl+Enter` triggers `api.compile`.
- `api/client.ts` maps HTTP codes → `toast`/`emptyState` per §6.4. A `success:false` 200 result clears the result panels and shows the Diagnostics empty-state (never misleads:no partial-success claims).
- `Rec.tabs` render only the fields present; each panel reads a slice from `Store`.

### 4.4 Sample-Program Catalog & Language-Selection Contract
**Fresh stock from the repo is empty (`samples/`, `css/`, `js/` are empty) — the plan must seed it.** The sample list is the basis for User Story 7 and every demo.

**Sample catalog** (by language — candidates, seeded into `samples/`):
| id | filename | language | purpose |
|----|----------|----------|---------|
| hello | `hello.c` | c | minimal main + printf (baseline) |
| arithmetic | `arithmetic.c` | c | expressions & conversions |
| factorial | `factorial.c` | c | for-loop (iterative factorial — no user functions per §5.9) |
| input1 | `input1.c` | c | nested for + if/else |
| input2 | `input2.c` | c | type conversions |
| input3 | `input3.c` | c | duplicate-declaration error |
| test | `test.c` | c | minimal regression |
| py-hello | `hello.py` | python | print + variables |
| py-func | `functions.py` | python | def/return/control flow |

> **§5.9 / FR-059 compliance:** every catalog entry MUST compile and render all 4 phases. `factorial.c` is the **iterative** factorial (no user functions — §5.9 U6); `hello.c` / `arithmetic.c` must use only the fixed `printf("<string>")` / `scanf("<string>", &id)` forms and no out-of-subset constructs. A catalog sample the pipeline cannot fully process is a P1 defect.

**Selection → language mapping (FR-041):** selecting a `.c` sample forces `language="c"` (and *vice versa* for `.py`) so the sample click and the editor mode are always coherent. The sample file list is fetched from `/api/samples`? **No** — to keep it deterministic and offline, the catalog is a frontend constant (`samples/catalog.ts`) with each file's path resolving at build time; the backend is not a file-list or engine for samples. The explorer lists the constant catalog; clicking sets `currentFile` and loads the canned source. (This satisfies "flips the selector" with no extra endpoint.)

---

## 5. Data Model (Consolidated) — source: spec §6 + FR-015…FR-024

All data flows through one canonical response schema. **This schema is the single source of truth across Python and C.**

| Field | Type | Description | Always Present |
|-------|------|-------------|----------------|
| `success` | `boolean` | Whether compilation completed | yes |
| `language` | `"c" \| "python"` | Pipeline used (echo of request) | yes |
| `tokens` | `Token[]` | Lexer output (both languages) | yes (empty list if lexer failed) |
| `parse_tree` | `TreeNode \| null` | Root of the parser's **derivation tree** (with semantic annotations); never synthetic (FR-037) | nullable (absent on parse error) |
| `symbol_table` | `Symbol[]` | Semantic-phase output | yes (possibly empty) |
| `ir_code` | `TAC[]` | Three-address code lines | yes |
| `errors` | `Diagnostic[]` | Errors with line/col | yes (possibly empty) |
| `warnings` | `Diagnostic[]` | Warnings | yes |
| `phases` | `{ lexer, parser, semantic, irgen }` | Phase statuses | yes |
| `raw_output` | `string` | Raw text for debugging | yes |

**Token**: `{ token: string, class: string, line: number, col: number }`
**Symbol**: `{ name, type, scope, value: string \| null, line }` — `value` is the compile-time constant initializer when statically determinable and `null` otherwise (FR-038).
**Diagnostic**: `{ level: "error" \| "warning", message, line: number, col: number }`
**Instruction (TAC)**: `{ op, arg1?: string, arg2?: string, result?: string, label?: string, line: number }`
**Phases**: `{ lexer: "waiting"|"running"|"done"|"error", parser/semantic/irgen likewise }`

**Validation rules** (derived from spec):
- `language` must be `c` or `python`; otherwise HTTP 400.
- Any error Diagnostic must carry `level, message, line, col` (FR-016).
- Unsupported-subset constructs (spec §5.9) must produce a clear diagnostic, not a miscompile (SC-003/SC-004, FR-005, FR-011, FR-016).

**State transitions (phases):** Each compilation phase follows `waiting → running → done` or `waiting → running → error`; the frontend renders this in Phase Flow (FR-035, User Story 2).

---

## 6. API Contracts (Consolidated) — /contracts/*

Base path: `/api` (Flask; `CORS` enabled — existing `app.py`).

### 6.1 `GET /api/status`
**204/200 OK**
```json
{ "active_feature": "server", "server": "running", "compiler": { "binary_found": true, "path": "..." }, "message": "..." }
```
- **200** on success; **502** if backend unreachable.
- Purpose: preflight them. (FR: status endpoint, User Story 5/9.)

### 6.2 `POST /api/compile`
Request:
```json
{ "code": "int main() { ... }", "language": "c" }
```
Responses:
- **200** success: full body per data-model §5.
- **400** — malformed JSON, missing `code`, or bad `language` (FR-021).
- **504** — timeout at 10 s (FR-019/FR-022); body: `{ success:false, errors:[{level:"error", message:"Compilation timed out after 10 seconds", line:0, col:0}] }`.
- **502** — required backend unavailable (compiler binary missing/server down) (FR-023).
- **200 with `success:false`** — empty/non-C-Python input, with empty-state-safe payload (FR-024).

### 6.3 `POST /api/tokenize`
```json
{ "code": "...", "language": "c" }
```
Returns minimally the `tokens` field even when the full pipeline fails (FR-017).

### 6.4 Error taxonomy (status codes)
| HTTP | Case |
|------|------|
| 200 | success OR graceful empty/unsupported input (success:false) |
| 400 | malformed request / bad `language` (includes validation — spec FR-021 defines no separate 422) |
| 502 | backend/compiler unavailable |
| 504 | timeout |

Frontend (`api/client.ts`) maps these codes to user-facing toasts and empty-states (FR-042, FR-043, FR-044).

---

## 7. Phase Plan (consolidated research + design by phase)

### Phase 0 — Foundation buildout + hardening (P0)
**Objective:** establish reproducible build + baseline test harness (per the Build Ground Truth matrix; the Makefiles do NOT yet exist).
- **Create** root `Makefile` (targets `all/setup/run/test/clean`) and **create** `compiler/Makefile` from the **verified** recipe (`lex` → `yacc -d -v` → `gcc -w -o compiler y.tab.c` — **omit `-ll`**: it links `libl`'s own `main` and fails the link; `yyerror`/`yywrap` are defined in-project). This is the single source of truth for the build (§2).
- **Decide the binary name** explicitly: the `compiler/Makefile` emits `compiler`; confirm `compiler_runner._find_binary()` resolves `compiler` first (probes `compiler`, `a.out`, `main`, `ccompiler`) and document the chosen one.
- **Resolve the argv-vs-stdin contract** (see §2.1): verify whether the binary reads its source as argv[1] or stdin, and adapt `compiler_runner.py` to the verified behavior (do not trust the README blindly).
- Create `backend/tests/` pytest fixtures that compile `samples` and assert non-empty tokens.
- **Unblock the compile endpoint (verified blockers):** (a) fix the duplicate `STRING` regex-group crash in `lexer_parser._fallback_tokenise` — it makes `/api/compile` return HTTP 500 on every C request today; (b) guard `print_inorder`/`print_tree` against a NULL tree so a syntax error never segfaults the binary (surface a clean diagnostic instead); (c) feed source via **stdin** — the binary reads stdin, not argv.
- Lock `requirements.txt` (flask, flask-cors) and add `pytest` into venv.
- Seed `frontend/` scaffolding + `samples/` catalog (§4.4) with pinned package-lock.
- **Exit gate:** `make clean && make` builds from a clean clone; `make test` green **and includes at least one non-empty compile smoke test** (a real C sample returning a schema-valid payload — an empty-but-green suite is NOT acceptable); SC-009.

**Research resolution (NEEDS CLARIFICATION → decided):**
- Language/version: Python 3.12 (existing `venv/`), TS 5.x (Node v24 available).
- Storage: none (in-memory stateless).
- Compile timeout: 10 s (spec FR-019).
- Binary naming/argv-vs-stdin: decided at P0 (see Ground Truth matrix).
- Subset boundaries: spec §5.9 — authoritative in spec.

### Phase 1 — C accuracy + grammar completeness + symbol table + tests (P1)
**Objective:** 100% of valid C samples pass all 4 phases; symbol table powers semantic checks; the grammar meets the updated §5.9.
- **Align output parsing to the real headers (FR-006):** the C binary emits `PHASE 1: LEXICAL ANALYSIS` … `PHASE 4: INTERMEDIATE CODE GENERATION`, **not** `=== TOKENS ===`-style markers. Align `lexer_parser._split_sections`/`SECTION_HEADERS` to the real headers, and decide the **token source**: add a PHASE-0 token-table dump in `lexer.l` (source of truth) **or** label the panel "Reconstructed Tokens" and golden-lock the regex output.
- **Grammar completeness vs §5.9 (new — the dominant P1 cost):** (a) add an operator-precedence/associativity table (`%left`/`%right`/`%prec`) so `* / %` > `+ -` > relational > logical, assignment right-assoc — the current grammar mis-associates `a - b - c` (FR-002); (b) make the `#include` header section **optional** (U2 — header-less programs valid); (c) add `%`, logical `&& || !`, `while`, `do-while`, `break`, `continue`; (d) route `double` to a clear unsupported diagnostic, never a miscompile; (e) pin calls to the fixed `printf("<string>")` / `scanf("<string>", &id)` forms.
- **IR-correctness (FR-004, verified bugs):** fix the stale-global-`buff` double emission in nested loops, the `a = NULL` output for uninitialized declarations, and undefined temp references (`j = t3`); emit **explicit conversion instructions** for semantic type conversions; golden-lock the IR for every §5.9 construct.
- **Diagnostics line/col accuracy (FR-016, verified bugs):** fix the lexer's `countn` line tracking so newlines inside `/* */` block comments are counted (line numbers currently drift); design and add column tracking for C diagnostics so `col` is real, not always 0.
- Build/verify **symbol table** as semantic output (FR-003/FR-014/User Story 2): declare-before-use, duplicate-detection, return-type check, type conversions — each surfaced as a diagnostic and rendered in the Symbol Table panel (`name,type,scope,value,line`, with `value` = const initializer or `null` per FR-038).
- Enforce the C subset matrix (§5.9): all supported constructs compile; all unsupported constructs (structs, pointers, arrays, `double`, etc.) produce a clear diagnostic — no miscompiles.
- Add C integration tests: every sample + every §5.9 construct + every §9 edge case.
- **Exit gate:** `make test` green; SC-003 / SC-008 true; `make clean && make` rebuilds; every §5.9 construct has a golden test and a precedence/associativity test.

### Phase 2 — Python pipeline + symbol table + tests (P2)
**Objective:** Python tokenizes, parses, builds a symbol table, and renders all 4 phases (FR-007…FR-012).
- New `backend/python_analyzer/` using stdlib `tokenize` + `ast`:
  - Build `tokens[]` via `tokenize`.
  - Build parse tree from `ast` CST.
  - Build symbol table from AST walk (functions/vars, scope, statically reachable type).
  - Produce IR for supported constructs.
- Python subset from §5.9: functions, control flow, imports (reported), `print`, arithmetic; unsupported → clear diagnostic.
- Python tests: samples + subset + edge cases.
- **Exit gate:** Python snapshot `make test` green; SC-004.

### Phase 3 — Unified multi-language pipeline + test both (P3)
- `compile_code` routes by `language` (FR-014).
- Add `language` to `/api/status` (FR-018) and `/api/compile` (FR-013/FR-015).
- Both return identical schema → frontend already handles both (FR-013).
- **Exit gate:** unified suite green.

### Phase 4 — Tier 1 & Tier 2 autocomplete (P4)
**Objective:** deterministic keyword + symbol completion in both languages (FR-025…FR-029).
- Build a `frontend/src/components/Completion.ts` CodeMirror autocomplete source (`@codemirror/autocomplete`).
- **Tier 1**: language keyword set (C keywords vs. Python keywords) keyed by active language.
- **Tier 2**: symbol table (from last compile result) — variables/functions/param names; function signatures suggested (spec §4, User Story 8).
- Map current active language at trigger time (FR-025, FR-029); run locally, no network (FR-028).
- Tests: vitest on the completion provider; editor no-lag check.
- **Exit gate:** completion works in both languages (SC-006).

### Phase 5 — UI/UX polish + symbol-table-driven features + full E2E (P5)
- Objective: production-ready edge handling (FR-038, FR-042, FR-043, FR-044) + full browser E2E (User Story 6 & 9).
- Interactive diagnostics; sortable symbol table (FR-038); empty states (FR-042); toasts (FR-043); connection-error handling (FR-044).
- Frontend: virtualized panel tokens at the large-file boundary; theme/dark; responsive resize.
- E2E via Playwright: every User Story 6 scenario + User Story 9 edge cases (C + Python) (SC-008).
- **Exit gate:** `make test` green including E2E; SC-007/SC-009; production smoke (missing binary message, server down message).

---

## 8. Complexity, MVP, and Schedule

Total 59 FRs (FR-001…FR-059). Suggested vertical slice sequence (each slice independently tested):
1. C end-to-end hardening (P0–P1) — core value.
2. Python pipeline (P2) — second language.
3. Unification + regression (P3).
4. Autocomplete (P4).
5. Polish + E2E (P5).

**Definition of Done (from spec §11):** every phase green (`make test` 0 failures; all acceptance scenarios; `make clean && make` clean-build). All new code obeys: no invented APIs; type safety (Rule 9); error handling (Rule 6); observability (Rule 19); performance (Rule 17); explicit (Rule 20).

**Risks:**
- **Runtime/subset boundary (subset matrix)** — mitigated by §5.9 tests that assert every unsupported construct yields a diagnostic.
- **C compiler output format coupling** — mitigated by a strict parsable-section contract (FR-006) + parse-time error mapped to HTTP 400.
- **Frontend build from cleaned** — resolved by documented pinned tool versions + a reproducible frontend-build target (FR-047).
- **Flask path fallback for SPA** — mitigate by `make run` main serving built frontend + static index fallback.
- **Unsupported-subset miscompile in the C pipeline** — mitigated by the §5.9 diagnostic contract and per-construct golden tests in P1.
- **Supported-subset precedence/associativity miscompile** (e.g., `a - b - c` → `a − (b−c)`) — mitigated by a mandatory `%left`/`%right`/`%prec` table (FR-002) plus golden tests asserting the exact IR for mixed-operator expressions.
- **Grammar-extension scope creep in P1** — the updated §5.9 (logical ops, `%`, `while`/`do-while`/`break`/`continue`, optional headers) is a large grammar change; sequence it with per-construct golden tests and do not fold it silently into "subset enforcement".

### 8.1b Deployment & Runtime (production — required for release)

- **Dev vs prod server**: `make run` = Flask dev server for local iteration; `make run-prod` = a production WSGI server (Waitress in-process or Gunicorn) binding `0.0.0.0` with `debug=False`. Never default to `app.run(debug=True)` for deployment.
- **CORS allowlist**: replace the permissive `CORS(app)` with an allowlist of only the serving origin(s) plus appropriate security headers (CSP, X-Content-Type-Options) (Rule 13). No wildcard needed; single-origin SPA.
- **CI gate**: a GitHub-Actions (or equivalent) workflow runs `make test` on push/PR after `npm ci` + `pip install -r` bootstrap (FR-047), enforcing reproducibility automatically.
- **Concurrency & abuse**: a compile lock/rate-limit (429) guards the subprocess path; request-body size limit (1 MB → 413) bounds memory (see §8.1).

### 8.1 Security & Robustness (compile service — mandatory in every phase that runs subprocesses)

Running user-supplied code is a remote-code-execution boundary. Every phase invoking the C binary or Python tooling MUST comply (CLAUDE.md Rules 6, 13, 17, 19):
- **Untrusted input**: treat `code` as untrusted; never interpolate into a shell string — pass via argv or a temp file only.
- **Time & resource caps**: keep the existing 10 s `subprocess` timeout (already in `compiler_runner.py`) **and** add an output-size cap (e.g., `MAX_OUTPUT = 1 MB`) and a memory/CPU limit on the subprocess.
- **Temp-file hygiene**: use `tempfile.NamedTemporaryFile(delete=False)` + `finally: os.remove` (already present); never let the compiler write into a shared cwd.
- **Max request size**: enforce a Flask request-body limit (e.g., 1 MB) returning `413` on exceed to bound memory.
- **Scope honesty**: the product compiles/analyzes — it is **not** a general execution sandbox; do not claim to safely execute arbitrary programs; rely on caps + timeout and document the boundary.
- **No auth assumption**: single-user local tool; keep the service parameter-less and embeddable for a future multi-user deployment rather than bolting on auth now.

### 8.2 Observability (CLAUDE.md Rule 19)
- Structured JSON log per `/api/compile`: `language`, `phases`, `success`, latency, returned HTTP code, token count. **Never log source code** (student code is private).
- Log timeout and backend-down events with the emitted code for cross-reference.
- Frontend logs `client.ts` fetch failures and the mapped toast (FR-043/FR-044) to console/devtools.
- `GET /api/status` (FR-018) already reports per-backend readiness — reuse as a health endpoint.
- No metrics/tracing system needed at this scale; centralize log records in one format for debuggability.

---

## 9. Evaluation & Validation

- Every FR mapped to a task in `/sp.tasks` with a test case — including **FR-059** (sample catalog within §5.9) and **SC-010** (≤ 2 s render, E2E-timed).
- `make test` runs: `pytest` (C+Python integration) + `vitest` (frontend) + `playwright` (E2E).
- Mapping: FR-group ↔ phase; each phase gate checked off in the phase table (§7).
- Post-implementation: re-run the Ruthless-Accuracy review persona on the working product against §7 success criteria and §9 edge cases.

---

*End of implementation plan — the complete technical design for `spec.md` is contained in this single file.*