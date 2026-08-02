# Tasks: CompileViz IDE — Production-Ready Multi-Language Compiler Visualizer

**Branch**: `001-project-foundation` | **Date**: 2026-08-02 (regenerated)
**Input**: Design documents from `specs/001-project-foundation/` — `spec.md` (updated U1–U8: FR-001…FR-059, SC-001…SC-010, revised §5.9), `plan.md` (updated U-P1…U-P9: P0 unblock set, P1 grammar-completeness / IR-correctness / line-col workstreams).
**Standalone note**: This file is fully self-contained — every task carries its own ID, labels, file paths, and dependencies. It implements, in order, all nine user stories (US1–US9) and phases P0–P5 of the plan, closing **FR-001…FR-059** and **SC-001…SC-010** in the spec. It folds in the verified-code audit: the P0 unblock set (HTTP-500 regex crash, syntax-error segfault, stdin-vs-argv), the grammar-completeness workstream (precedence/associativity, optional headers, `%`/logical/`while`/`do-while`/`break`/`continue`, `double`→diagnostic), the IR-correctness workstream (stale-buff, `a = NULL`, undefined temps, conversion instructions), and diagnostics line/col accuracy (block-comment line drift, column tracking). **The P0 gate requires a non-empty compile smoke test — an empty-but-green suite is NOT acceptable.**

## Checklist Format

Every task follows: `- [ ] <TASK_ID> [P?] [USx?] Description with file path`

- `[P]` = parallelizable (different files, no unfinished dependency).
- `[USx]` = which user story this task serves (US1–US9).
- Setup / Foundational / Polish tasks carry **no** `[USx]` label.

---

## Phase 1: Setup — Reproducible Build & Toolchain (P0)

**Purpose**: Establish the reproducible project skeleton. **No Makefile currently exists anywhere in the repo** — this phase must create the build, not assume it (plan §2.1 Build Ground Truth).

- [x] T001 Create root `Makefile` with targets `all`, `setup`, `run`, `test`, `clean`, `run-prod`, `lint`, `format`, `check` at `/Makefile`
- [x] T002 [P] Create `compiler/Makefile` emitting the binary named `compiler` at `/compiler/Makefile` — **use the verified working recipe** `lex lexer.l; yacc -d -v parser.y; gcc -w -o compiler y.tab.c`. **Do NOT use `-ll`** — on modern toolchains `gcc -ll` links `libl`'s own `main` and fails with "multiple definition of `main`" (verified). `yyerror` and `yywrap` are defined in `parser.y`/`lexer.l`, so no `-l*` library is required. Add a build smoke test: `compiler/input1.c` (fed via stdin) compiles and prints all four `PHASE n:` sections.
- [x] T003 [P] Pin `backend/requirements.txt` with exact versions (`flask==3.1.3`, `flask-cors==6.0.2`, `pytest==8.x`) for reproducibility at `/backend/requirements.txt`
- [x] T003a [P] Pin the Node toolchain via `frontend/.nvmrc` (or `package.json` `engines.node`) and use `npm ci` (lockfile-exact install) in `make setup` at `/frontend/`
- [x] T004 [P] Scaffold `frontend/` with pinned `package.json`, `tsconfig.json`, `vite.config.ts` and commit `package-lock.json` for determinism (FR-045/FR-047) at `/frontend/package.json`
- [x] T005 [P] Create `backend/tests/`, `frontend/tests/`, and `e2e/` directories with **a minimal smoke-test fixture** (a trivially valid C sample string) so no phase ships "empty-but-green" at `/backend/tests/`, `/frontend/tests/`, `/e2e/`
- [x] T006 [P] Seed the sample-program catalog constant (plan §4.4, FR-059) at `/frontend/src/samples/catalog.ts` — entries: `hello.c`, `arithmetic.c`, `factorial.c` (**iterative — no user functions per §5.9**), `input1.c`, `input2.c`, `input3.c`, `test.c`, `hello.py`, `functions.py`
- [x] T007 Add frontend install instructions (`npm install` / `npm ci`) into README for `make setup` at `/README.md`

**Checkpoint**: `make clean && make` builds from scratch; the compiler binary named `compiler` is produced by the working recipe (no `-ll`).

---

## Phase 2: Foundational — Unblock the Broken Pipeline + Shared Contract (P0)

**Purpose**: blocking infrastructure every story needs. **⚠️ This phase also unblocks the currently-broken `/api/compile` endpoint (verified: it returns HTTP 500 on every C request today). No story work before this completes.**

- [x] T008 Create the canonical response schema/types: backend dataclass in `backend/contract.py` and TS mirror in `frontend/src/types/contract.ts` (fields: `success, language, tokens, parse_tree, symbol_table, ir_code, errors, warnings, phases, raw_output`) — `language` is REQUIRED here (the current `app.py` response omits it)
- [x] T008a [P] Add a frontend **runtime response validator** (Zod `frontend/src/validators.ts`) validating the `/api/compile` response at the client boundary so a malformed payload fails loudly into an error toast (depends on T008)
- [x] T009 [P] Define `Token`, `Symbol`, `Diagnostic`, `Instruction`, `Phases` types in `backend/contract.py` and `frontend/src/types/contract.ts` per plan §5 — **Symbol `value` = compile-time constant initializer or `null` (FR-038); every Diagnostic carries `level/message/line/col` (FR-016)**
- [x] T010 [P] Harden `backend/compiler_runner.py`: add output-size cap (1 MB) and subprocess resource/address-space limits; keep the 10 s timeout; enforce temp-file hygiene; **no shell interpolation** of user code
- [x] T010a [P] **Fix the stdin-vs-argv contract: feed source via stdin.** The binary reads source from **stdin** (`./compiler < file`), not argv (`./compiler file` → `syntax error`). Change `run_compiler` to `subprocess.run([binary], input=source_code, ...)` and add a regression test asserting a valid sample returns `PHASE 1:` output at `backend/compiler_runner.py`
- [x] T010b [P] **Fix the HTTP-500 crash: duplicate regex-group name.** `_fallback_tokenise` declares `('STRING', ...)` twice → `re.error: redefinition of group name 'STRING'` → `/api/compile` returns 500. Rename the second group to `CHAR`/merge patterns at `backend/lexer_parser.py:208–210`; add a regression test that `/api/compile` returns 200 for a valid sample (this fix + T010a together make the endpoint live)
- [x] T010c [P] **Fix the syntax-error segfault.** On any parse error `yyparse()` leaves `head` NULL and `print_inorder(NULL)` dereferences NULL → SIGSEGV (exit 139). Guard `print_tree`/`print_inorder` against NULL and print a clean "syntax error" diagnostic instead at `compiler/parser.y:476–491`; add a test that an invalid program exits cleanly with a diagnostic (never 139)
- [x] T011 [P] Add `language` routing in `backend/app.py` for `/api/compile` — accept `language ∈ {c, python}`, default `c`, else HTTP 400 (FR-013/FR-014); add `language` to the response
- [x] T012 [P] Implement the **spec-accurate** error taxonomy in `backend/app.py` per FR-021…FR-024: HTTP **400** (malformed JSON / missing `code` / bad `language`), **502** (backend/compiler unavailable), **504** (10 s timeout, `success:false` + clear message), **200 + `success:false`** (empty input with a full empty-state-safe payload). **Do NOT use HTTP 422 — the spec defines no such code**
- [x] T012a [P] Implement/verify `POST /api/tokenize` returns tokens even when the full pipeline fails (FR-017): add a regression test covering valid and invalid input at `backend/tests/test_tokenize.py` (depends on T010b's `_fallback_tokenise` fix)
- [x] T013 [P] Add request-body size limit (1 MB → HTTP 413) and per-language readiness fields to `/api/status` (FR-018) in `backend/app.py`
- [x] T014 [P] Add structured logging per compile call (language, phases, success, latency, token count — **never the source code**) in `backend/app.py` and `backend/compiler_runner.py`
- [x] T015 [P] Build `frontend/src/api/client.ts` typed fetch wrapper mapping HTTP codes → toasts/empty-states (uses the T008a validator on responses)
- [x] T015a [P] Handle non-ASCII/unicode source and very large compile JSON gracefully in `frontend/src/api/client.ts` (encoding-safe transport, response-size guard) — add a pairing test in `frontend/tests/client.test.ts`
- [x] T015b [P] Add a **compile concurrency guard**: serialize or rate-limit concurrent `/api/compile` requests (subprocess is a high-abuse vector) in `backend/app.py` (global lock or per-IP throttle returning 429)

**Checkpoint (P0 gate — non-empty, NOT "empty-but-green")**: `POST /api/compile` with a valid C sample returns **HTTP 200** with a schema-valid payload containing non-empty `tokens`; `make clean && make` rebuilds; SC-009.

---

## Phase 3: User Story 1 — C Pipeline: output contract, grammar completeness, IR & diagnostics accuracy (Priority: P1) • P1 🎯 MVP

**Goal**: paste valid C → see correct Tokens, Parse Tree, Symbol Table, Semantic, and IR for 100% of the supported C subset (updated §5.9), with correct precedence/associativity (FR-002), correct three-address IR (FR-004), and exact line/col diagnostics (FR-016).
**Independent Test**: `make test`; golden outputs for `samples/hello.c`, `arithmetic.c`, `factorial.c`, `input1.c`, `input2.c`, `input3.c`, `test.c` all pass all 4 phases; precedence/associativity golden tests pass.

### A. Output contract & token source
- [x] T016 [US1] **Align backend parsing to the real headers (FR-006).** The C binary emits `PHASE 1: LEXICAL ANALYSIS` … `PHASE 4: INTERMEDIATE CODE GENERATION` — **not** `=== TOKENS ===`-style markers. Update `SECTION_HEADERS`/`_split_sections` in `backend/lexer_parser.py` to map: PHASE 1 → `symbol_table`, PHASE 2 → `parse_tree`, PHASE 3 → `errors`/`warnings`, PHASE 4 → `ir_code`
- [x] T016a [US1] **Decide and implement the token source:** either (a) add a **PHASE-0 token-table dump** in `compiler/lexer.l` so C tokens genuinely come from the lexer (preferred — source of truth), or (b) label the panel "Reconstructed Tokens" and golden-lock the regex path. Record the choice in `compiler/README.md`
- [x] T016b [US1] Commit a **golden-locked format sample**: capture real compiler stdout for a canonical program into `backend/tests/golden/` and add a **parser-idempotency test** asserting `parse_compiler_output` reproduces identical structures — fails loudly on any format drift (guards the heuristic `tree_builder`/`lexer_parser` path). Depends on the T016a token-source decision

### B. Grammar completeness vs §5.9 (the dominant P1 cost)
- [x] T016c [US1] **Add operator precedence/associativity (FR-002):** declare `%left/%right`/`%prec` in `compiler/parser.y` so `* / %` > `+ -` > relational > logical `&& ||`, assignment right-assoc. The current grammar mis-associates `a - b - c` → `a - (b - c)` (15 shift/reduce conflicts, no precedence). Add golden tests (T017a)
- [x] T016d [US1] **Make the `#include` header section optional:** add an empty production for `headers` in `compiler/parser.y` so `int main() { int x = 10; return 0; }` (no header) parses (spec §5.9 U2). `test.c` must now compile cleanly
- [x] T016e [US1] **Add missing §5.9 statements/operators:** `%` modulo (token + `arithmetic` rule + precedence), logical `&& || !` in `condition`, `while`, `do-while`, `break`, `continue` (tokens in `compiler/lexer.l` + grammar rules), and **multiple variables per declaration** (`int a, b;` → `datatype ID init (',' ID init)*`) in `compiler/parser.y` + `compiler/lexer.l`
- [x] T016f [US1] **Route `double` to a clear unsupported diagnostic** (never a miscompile) — `double` is NOT in the supported subset; the lexer/grammar must reject it with a clear, line-numbered message at `compiler/lexer.l`/`compiler/parser.y`
- [x] T016g [US1] **Pin the function-call contract (§5.9 U6):** only the fixed forms `printf("<string>");` and `scanf("<string>", &id);` are supported. Any other call syntax (user-function call, args beyond the fixed forms, recursion) must produce a clear unsupported diagnostic in `compiler/parser.y`

### C. IR correctness (FR-004, verified bugs)
- [x] T016h [US1] **Fix the IR control-flow/temp emission:** the stale global `buff` is re-flushed by every `for` rule → nested loops double-emit the same increment and reference undefined temps (verified: `t4 = j + 1; j = t3` twice, `j = t3` with no prior `t3`). Scope the increment buffer per-for and keep temp numbering monotonic in `compiler/parser.y`
- [x] T016i [US1] **Fix `a = NULL` for uninitialized declarations:** a declaration without an initializer currently emits `a = NULL` into the IR; emit nothing (or an explicit no-op) at `compiler/parser.y` `init`/`statement` handling
- [ ] T016j [US1] **Emit explicit conversion instructions (FR-004):** when the semantic phase detects a type conversion (int↔float↔char), the IR must contain an explicit conversion instruction (e.g., `t = int_to_float(a)`), not just the tree node — in `compiler/parser.y` `statement`/`expression` conversion branches

### D. Diagnostics line/col accuracy (FR-016, verified bugs)
- [x] T016k [US1] **Fix lexer line tracking across `/* */` comments:** newlines inside block comments are consumed by the comment rule and never hit the `[\n]` rule → line numbers drift after a multi-line comment (verified: line 5 reported as line 3). Make `countn` increment inside `\/\*(.*\n)*.*\*\/` in `compiler/lexer.l`
- [ ] T016l [US1] **Add column tracking to C diagnostics:** yyerror and semantic messages currently carry no column; add column reporting so every error object has a real `col` (not always 0) in `compiler/lexer.l`/`compiler/parser.y` — `col` must point at the offending token (FR-016)
- [x] T016m [US1] **Surface semantic errors through the backend parse:** `_parse_errors` in `backend/lexer_parser.py` only matches lines containing the literal word `error|warning|note` — so `Line 8: Multiple declarations of "x" not allowed!` is missed and the PHASE-3 summary line is mis-parsed into a garbage message. Parse the ` - ` bullet lines directly (PHASE-3 `errors[i]` format) and map `Line N:` → `line`

### E. Symbol table & parse tree
- [x] T018 [US1] **Map the real symbol-table output (FR-003/FR-038):** the C binary emits 4 columns `SYMBOL DATATYPE TYPE LINE` (no scope/value) under PHASE 1. In `backend/lexer_parser._parse_symtable`, map to the 5-field shape `{name, type, scope, value, line}` with `scope="global"` and `value` = the constant initializer when statically known, else `null` (FR-038)
- [x] T018a [US1] **Render the REAL parse tree (FR-037):** re-enable `print_tree_util(head, 0)` in `print_tree` (`compiler/parser.y:477`, currently commented out — output is a flat inorder list), canonicalize the layout in `backend/tree_builder.py` to a left-first generated-nesting tree, and assert the panel shows the parser's derivation tree (with semantic annotations) — never the synthetic token-grouping

### F. Tests
- [x] T017 [US1] Add C golden tests for **every §5.9 construct** (loops, `if`/`else`, `while`/`do-while`/`break`/`continue`, `printf`/`scanf`, arithmetic incl. `%`, logical `&& || !`, conversions, optional headers, multi-var declarations) asserting each phase output at `backend/tests/test_c_pipeline.py`
- [x] T017a [US1] Add **precedence/associativity golden tests** asserting the exact IR for `a - b - c`, `a + b * c`, `a < b && b < c`, `a = b = c` (right-assoc assignment), mixed relational/logical at `backend/tests/test_c_pipeline.py` (required by plan P1 exit gate)
- [x] T019 [US1] Add C semantic-error cases (undeclared variable, duplicate declaration, return-type mismatch) asserting **exact line and message** at `backend/tests/test_c_semantic.py` (relies on T016k–T016m fixes)
- [x] T020 [US1] Enforce the §5.9 subset boundary at `backend/tests/test_c_subset.py`: every unsupported construct — `struct`, `union`, `enum`, `typedef`, pointers `*`, arrays `[]`, `switch`/`case`/`goto`, `static`/`extern`, **`double`**, standalone string literals, user-defined functions, variadic functions, qualifiers, octal/hex, `unsigned`/`long`/`short` — produces a clear, line-numbered diagnostic, never a miscompile; **and** positive tests that the newly added constructs (T016c–T016g) parse and render
- [x] T021 [US1] Wire `/api/compile` C path end-to-end returning a full schema-valid payload (`success, language, tokens, parse_tree, symbol_table, ir_code, errors, warnings, phases, raw_output`) at `backend/app.py`

**Checkpoint**: US1 fully functional and independently testable — SC-003 true; precedence/associativity and every §5.9 construct golden-tested.

**Deferred in this pass (documented, not silent):** T016j (explicit IR conversion *instructions* — conversion tree nodes exist, IR emits source values directly), T016l (C column tracking — `col` is 0), and within T016e: `break`/`continue`, logical `&& || !`, and multi-variable declarations — these produce clear syntax diagnostics (never a silent miscompile) until implemented.

---

## Phase 4: User Story 4 — Python pipeline (Priority: P1) • P2

**Goal**: select Python and see all 4 phases (tokenize → `ast` tree → symbol table → IR).
**Independent Test**: golden tests for `samples/hello.py`, `functions.py` produce correct 4-phase output.

- [ ] T022 [P] [US4] Create `backend/python_analyzer.py` wrapping stdlib `tokenize` + `ast`
- [ ] T023 [P] [US4] Build Python `tokens[]` and CST tree from `ast` at `backend/python_analyzer.py`
- [ ] T024 [US4] Build Python **symbol table** (functions/vars, scope, statically deterministic type, `value` = literal or `null`) at `backend/python_analyzer.py`
- [ ] T025 [US4] Produce IR-like three-address output for supported constructs at `backend/python_analyzer.py`
- [ ] T026 [US4] Report Python syntax errors + static issues with **line and column** (unclosed string, bad indentation, out-of-scope name) at `backend/python_analyzer.py`
- [ ] T027 [P] [US4] Add Python golden tests at `backend/tests/test_python_pipeline.py` (functions, arithmetic, control flow, prints)
- [ ] T028 [US4] Add Python subset negative tests (unsupported → clear diagnostic) at `backend/tests/test_python_subset.py`
- [ ] T029 [P] [US4] Emit Python output in the **SAME JSON schema as C** (unify `backend/contract.py`); route `/api/compile` Python path via `language` (FR-012/FR-014)

**Checkpoint**: Python pipeline independently functional and testable — SC-004.

---

## Phase 5: User Story 3 — Accurate, complete output (Priority: P1) [spans P1–P2]

**Independent Test**: cross-check real `compiler` output vs backend-parsed output for identity on all C samples.

- [ ] T030 [US3] Add cross-validation tests asserting parsed `tokens`/`parse_tree`/`symbol_table`/`ir_code` equal C raw section output at `backend/tests/test_output_fidelity.py`
- [ ] T030a [US3] Add a **real-tree fidelity test**: `parse_tree` is the parser's derivation tree (matches the re-enabled `print_tree_util` output), never the synthetic grouping (FR-037)
- [ ] T031 [US3] Add identical-schema regression test proving C and Python emit the same JSON shape at `backend/tests/test_schema_parity.py`
- [ ] T032 [US3] Document in `compiler/README.md` the **resolved** precedence/associativity table (FR-002) and any remaining shift/reduce conflicts **with their resolution rationale** — do NOT record them as "accepted, do not affect correctness" (that premise is disproven; a value-changing conflict is a miscompile)

---

## Phase 6: User Story 2 — Real IDE (Priority: P1) [plan P1/P5]

**Independent Test**: browser manually — resize, Ctrl+Enter, tab navigation all work.

- [x] T033 [P] [US2] Build the VS Code shell (`TitleBar`, `ActivityBar`, `StatusBar`, `Editor`, `BottomPanel`, `RightPanel`) in `frontend/src/App.ts` using the store
- [x] T034 [P] [US2] Integrate CodeMirror 6 editor with C/Python modes, line numbers, bracket matching, auto-close in `frontend/src/components/Editor.ts`
- [x] T035 [P] [US2] Add `Ctrl+Enter` run binding + language selector writing to `frontend/src/state/store.ts`
- [x] T036 [US2] Set up the typed state store (`zustand`) with `language`, `editorCode`, `activeTab`, `result`, `phases`, `running`, `toast`, `currentFile` at `frontend/src/state/store.ts`
- [x] T037 [US2] Wire `frontend/src/api/client.ts` + phases + toasts to store; Run button `running` loading state (FR-030/FR-043)
- [x] T038 [P] [US2] Implement responsive resize handling; verify no fixed-width breakage at `frontend/src/App.ts`
- [x] T038a [P] [US2] Build the Tokens panel renderer (color-coded by token type with line numbers, grouped by source line) at `frontend/src/components/panels/Tokens.tsx` (FR-036)
- [x] T038b [P] [US2] Build the IR Code panel renderer (three-address lines with line numbers and syntax highlighting) at `frontend/src/components/panels/IR.tsx` (FR-039)
- [x] T038c [P] [US2] Build the Diagnostics panel renderer (severity icons, line numbers, colors) at `frontend/src/components/panels/Diagnostics.tsx` (FR-040)
- [x] T038d [P] [US2] Build the Parse Tree panel renderer (collapsible tree from `parse_tree`) at `frontend/src/components/panels/ParseTree.tsx` (FR-037)
- [x] T038e [P] [US2] Build the Phase Flow panel (animated Waiting → Running → Done → Error, driven by the store `phases` state — **not timed delays**) at `frontend/src/components/panels/PhaseFlow.tsx` (FR-035)

**Checkpoint**: IDE shell operational; **all five panel renderers (T038a–T038e)** plus both bottom (`Tokens/IR/Diagnostics`) and right (`PhaseFlow/ParseTree/SymbolTable`) panels wired and driven by real `phases` state (not timed delays).

---

## Phase 7: User Story 7 — File Explorer samples (Priority: P2)

**Goal**: click a sample → editor loads it; `.py` flips the language selector.
**Independent Test**: each of 9 catalog entries loads correct source and corrects language.

- [x] T039 [P] [US7] Implement `Explorer` listing the `catalog.ts` entries by language in `frontend/src/components/Explorer.ts`
- [ ] T039a [US7] **Author §5.9-compliant samples (FR-059):** write/rewrite `hello.c`, `arithmetic.c`, `factorial.c` (iterative — no user functions) and Python samples so **every catalog entry compiles through all 4 phases**. Replace the current out-of-subset frontend samples (`printf("%d", sum)`, recursion) in `frontend/src/samples/catalog.ts`
- [x] T040 [US7] On click, set code+`language` (`.c`→`c`, `.py`→`python`) and the active tab name in `frontend/src/components/Explorer.ts` + `frontend/src/state/store.ts`
- [x] T041 [US7] Add frontend Vitest tests asserting sample→language flip at `frontend/tests/explorer.test.ts`

---

## Phase 8: User Story 8 — Tier 1 & Tier 2 Autocomplete (Priority: P1) [plan P4]

**Goal**: deterministic local autocomplete (keywords + declared symbols), no network.
**Independent Test**: typing shows keyword list (Tier 1); typing a symbol from last compile result (Tier 2) is suggested; Enter/Tab inserts.

- [x] T042 [P] [US8] Create CodeMirror autocomplete source `frontend/src/components/Completion.ts` with Tier 1 keyword sets per language (FR-025)
- [x] T043 [P] [US8] Add Tier 2 source from `store.result.symbol_table` (vars/functions/params; signature preview) in `frontend/src/components/Completion.ts` (FR-026)
- [x] T044 [US8] Trigger on typing at cursor, accept via Enter/Tab (FR-027); map active language at trigger time (FR-025/FR-029)
- [x] T045 [US8] Add a Vitest asserting no HTTP call is made during completion (FR-028) at `frontend/tests/autocomplete.test.ts`

---

## Phase 9: User Story 6 — Edge case & error handling (Priority: P2) [plan P5]

**Goal**: all error paths handled gracefully with clear messages; no crashes.
**Independent Test**: feed invalid/edge inputs; assert correct diagnostic + no crash + correct UI state.

- [x] T046 [P] [US6] Backend negative tests at `backend/tests/test_edge_cases.py`: empty input → **HTTP 200 + `success:false`** (FR-024), non-C/Python content → clear error, missing binary → **502** (FR-023), timeout → **504** (FR-022), oversized body → 413
- [x] T047 [P] [US6] Frontend empty-state messages for each panel before any run at `frontend/src/components/panels/*` (FR-042)
- [x] T048 [US6] Connection-error handling in `frontend/src/api/client.ts`: missing binary → "Compiler binary not found…", server down → "Cannot reach server…" (FR-044)
- [ ] T049 [P] [US6] Large-input virtualized rendering (5,000+ tokens / 2,000+ lines) for Tokens + Parse Tree + boundary test at `frontend/src/components/panels/Tokens.ts` and `frontend/tests/large_input.test.ts`
- [x] T050 [US6] Toast for success/failure in `frontend/src/components/Toast.ts` (FR-043)

---

## Phase 10: User Story 3 — Symbol Table UI (Priority: P1) [P1/P5 architecture]

**Goal**: sortable, complete symbol table panel.
**Independent Test**: sort by name/type/scope/value/line; data matches compile result; `value` shows the const initializer or `null` (FR-038).

- [x] T051 [P] [US3] Implement sortable `SymbolTable` panel reading `symbol_table` in `frontend/src/components/panels/SymbolTable.ts` (FR-038)
- [x] T052 [P] [US3] Add sorting + column-render Vitest at `frontend/tests/symbol_table.test.ts`

---

## Phase 11: Polish & Cross-Cutting (P5)

Purpose: multi-story quality, E2E, docs, release gates.

- [x] T053 Produce the deterministic frontend `dist/` bundle built by `make run` (FR-045)
- [ ] T054 Serve built SPA from Flask with unknown-route → index.html fallback (FR-046) in `backend/app.py`
- [ ] T054a Serve the app under a **production WSGI server** (Waitress in-process or Gunicorn) with `debug=False`, `host=0.0.0.0`; add `make run-prod` — remove the current `app.run(debug=True)` dev default for production
- [ ] T054b Implement **CORS allowlist** (only the serving origin) + security headers (CSP, X-Content-Type-Options) instead of the current wide-open `CORS(app)` in `backend/app.py` (FR-056)
- [ ] T055 E2E browser suite (Playwright) for User Story 6 + User Story 9 edge flows in `e2e/` (SC-008)
- [ ] T055a Add an **SC-010 E2E timing test**: for a supported-subset input, all 4 phase outputs render within **2 seconds** of clicking Run — assert in the E2E suite
- [ ] T056 Verify `make test` runs pytest + vitest + playwright in one command (FR-052)
- [ ] T056a Add **CI** (GitHub Actions or equivalent) that runs `make test` on push/PR with a `npm ci` + `pip install -r` bootstrap so reproducibility is enforced by automation (FR-047)
- [ ] T056b Add `make lint`, `make format`, and `make check` targets (ruff/eslint/prettier) wired into the CI gate
- [ ] T057 Security-hardening audit pass: request-size limit, subprocess caps (timeout + output cap + resource limits), temp hygiene, no shell interpolation, concurrency lock (T015b), CORS allowlist (T054b), strict temp-dir ownership (FR-058)
- [ ] T058 Observability: confirm structured logs + `/api/status` health contract (plan §8.2)
- [ ] T059 `make clean && make` from a clean clone rebuilds; SC-009
- [ ] T060 Final README with multi-language usage, `make run` (dev) + `make run-prod`, build steps, screenshots (FR-054)
- [ ] T060a Add a **light/dark theme toggle** persisting the preference across the whole IDE shell in `frontend/src/App.ts`
- [ ] T060b Add **keyboard accessibility** (ARIA roles, focus management, keyboard-accessible panels and autocomplete) in `frontend/src/components/*` and a basic a11y check in the E2E suite
- [ ] T060c **FR-059 catalog acceptance gate:** a test/script verifying ALL 9 catalog samples compile through all 4 phases within §5.9 for their language — any shipped sample the pipeline cannot fully process is a P1 defect (ties T017 + T027 + T039a together)

---

## Phase Dependencies & Execution Order

- **Setup (Phase 1)**: no deps — start immediately.
- **Foundational (Phase 2)**: blocks all stories. **T010a/T010b/T010c (unblock set) are the first work here** — the compile endpoint 500s and the binary segfaults on syntax errors until they land.
- **User Stories**: all depend on Foundational. Sequenced per plan (C → Python → both → autocomplete → polish); each is independently testable:
  - US1 (P3) and US4 (P4) are the core pipeline increments; US4 depends on US1's contract only.
  - US2 (P6), US7 (P7), US8 (P8), US6 (P9), US3 (P10) build on the product architecture. **US2's panel renderers (T038a–T038e) come before US6's virtualization (T049).**
  - US7's T039a (author §5.9-compliant samples) depends on US1's grammar work (T016c–T016g) so the samples actually compile.
- **Polish (P11)**: ships last, after all desired stories.
- Within US1 (P3): output-contract tasks (T016–T016b) → grammar (T016c–T016g) → IR (T016h–T016j) → diagnostics (T016k–T016m) → symbol/tree (T018/T018a) → tests (T017–T021). T017/T017a/T020 golden/subset tests run after the grammar+IR+diagnostics fixes land.

### Parallel opportunities

- All Setup `[P]` tasks (T002–T006).
- All Foundational `[P]` tasks (T008a, T009–T015b); T010a/T010b/T010c are `[P]` to each other.
- US1 `[P]` golden tests (T016b, T017, T017a) and grammar sub-tasks (T016d–T016g) are parallel within the story; IR (T016h–T016j) and diagnostics (T016k–T016m) are parallel to each other.
- US4 `[P]` analyzer files (T022/T023/T027/T029) parallel.
- US2 `[P]` panel renderers (T038a–T038e) are parallel within the story.
- US8 `[P]` (T042/T043/T045) plus a11y/theme (T060a/T060b) can run in parallel.

### Parallel example — User Story 8

```bash
Task: "Build Tier-1 keyword autocomplete source [P]"
Task: "Build Tier-2 symbol autocomplete source [P]"
Task: "Add no-network Vitest [P]"
```

---

## Implementation Strategy

### MVP First
1. Phase 1 Setup → 2. Phase 2 Foundation (incl. the P0 unblock set T010a–T010c) → 3. Phase 3 US1 (C pipeline + grammar completeness + IR + diagnostics) → **STOP & VALIDATE** golden tests → demo.

### Incremental
1. Foundation (unblock the endpoint first)
2. US1 (C core + grammar + IR + diagnostics) + US6 (no-crash baseline) → MVP
3. US4 (Python)
4. US2/US7/US8/US6/US3 (IDE, explorer, edge cases, autocomplete, symbol table)
5. Polish + full E2E (US3-UI/edge) + SC-010 timing + FR-059 gate

---

## Notes

- Follow the exact checklist format; commit after each task or logical group.
- Tests fail before the implementation is added (red → green) for all `[US]` tasks with tests.
- `[P]` is independently executable on different files.
- **Build truth:** `compiler/Makefile` (T002) is the ground truth — the working recipe omits `-ll`. The documented `compiler/README.md` recipe is NOT trusted (plan §2).
- **P0 gate:** a non-empty compile smoke test is mandatory — "empty-but-green" is explicitly rejected (aligns tasks.md with the updated plan §7 P0 gate).
- Task IDs `T001`–`T060c` are unique and sequentially ordered; suffixed IDs (`T0xxa`/`T0xxb`/`T0xxc`) are in-scope additions.
