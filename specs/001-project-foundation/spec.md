# Feature Specification: CompileViz IDE — Production-Ready Multi-Language Compiler Visualizer

This document is **fully self-contained**. It defines the entire feature — purpose, scope, technology, user scenarios, requirements, testing, success criteria, assumptions, edge cases, and quality checklist — from the first line to the last. There are no external references, links, or dependencies on any other file. Everything required to plan, build, and verify this feature is below.

---

## 1. Overview

### 1.1 Product Purpose
CompileViz IDE is a browser-based, VS Code-style integrated environment for **learning compiler construction**. It allows a user to write or paste real C and Python programs and watch the complete compilation pipeline — Lexical, Syntax (Parsing), Semantic, and Intermediate Code (IR) generation — run end-to-end, with every phase visualized and explained. It must be **100% accurate** in every phase it claims to support and production-ready enough to be **sold to universities** as a teaching tool.

### 1.2 Product Vision
- A polished, responsive, VS Code-native-feeling IDE.
- A compiler pipeline that is correct and complete for the supported language subset.
- Output that is trustworthy, deterministic, and clearly presented.
- Extensible to more languages over time (Python now; C++ later).

### 1.3 Problem Being Solved
The existing codebase works but has no automated tests, limited accuracy guarantees, a weakly-typed single-file frontend, and only a single language. This spec drives it to a hardened, tested, multi-language, production-ready product.

### 1.4 Users
- **University students** learning compiler construction.
- **Instructors/lecturers** demonstrating compiler phases.
- **Developers and hobbyists** exploring compilation.

### 1.5 Priority Scope
Everything in this document is in scope for this feature. Anything not written here is out of scope. See §2 (Roadmap) and §8.2 (Explicitly Out of Scope).

---

## 2. Execution Roadmap (Phased Delivery)

The feature is delivered in ordered phases so each stage is tested and hardened before the next begins. Each phase has an **entry gate** (the previous phase must be green) and an **exit gate** (a definition of done that must be fully satisfied).

The intended order (per product decision): **C first → test it → Python → test it → test both together → add Tier 1 & Tier 2 auto-completion → polish symbol-table-driven features and the IDE.**

| Phase | Scope (definition of work) | Entry Gate | Exit Gate (definition of done) |
|-------|---------------------------|------------|-------------------------------|
| **P0** | Harden the existing foundation; add a baseline test harness | — | Existing C pipeline runs end-to-end; baseline automated tests added and passing |
| **P1** | C language: full accuracy in all 4 phases (including **grammar completeness against §5.9** — precedence/associativity, logical operators, `%`, `while`/`do-while`/`break`/`continue`, optional headers); build the **symbol table** as part of semantic analysis; C tests | P0 green | 100% of valid C samples pass all 4 phases; symbol table powers semantic checks; `make test` green |
| **P2** | Python language: tokenize, parse via `ast`, build a **symbol table**, produce IR; Python tests | P1 green | Python tokenizes, parses, builds a symbol table, and renders all 4 phases correctly; tests green |
| **P3** | Unified multi-language pipeline; **test C and Python together** | P2 green | Language routing is correct; combined regression suite (C + Python) is fully green |
| **P4** | **Tier 1 & Tier 2 auto-completion** (symbol-table driven) | P3 green | Keyword + declared-symbol completion works for both languages |
| **P5** | UI/UX polish, robust diagnostics, and a full end-to-end browser test suite | P4 green | Production-ready edge handling; end-to-end suite fully green |

### 2.1 On the Symbol Table
The **symbol table is a core output of the semantic-analysis phase** in P1 (C) and P2 (Python) — it is not a later add-on. It powers semantic checks in those phases, drives **Tier 2 auto-completion** in P4, and its in-IDE presentation is polished in P5.

### 2.2 Definition of "Phase Green"
A phase is "green" only when: all its automated tests pass with 0 failures, its exit gate conditions are met, and the product still builds from scratch (`make clean && make`).

---

## 3. Confirmed Technology Stack (decided)

The single most important constraint is **accuracy**. This stack maximizes correctness; because Python's Python compiler pipeline must always reflect the true Python semantics, the backend must run on **Python** to use the standard library `ast` module (CPython's actual parser). The frontend modernizes to TypeScript.

| Layer | Decision | Rationale |
|-------|----------|-----------|
| **C compiler core** (`compiler/`) | **Keep** Lex + Yacc + GCC | Real, hand-written lexer/parser is pedagogically correct for compiler-construction teaching; already working |
| **Backend** | **Python** (Flask now; FastAPI is an acceptable upgrade) | Only way to get 100% accurate Python parsing via stdlib `ast` and to drive the C subprocess |
| **Frontend** | **TypeScript + CodeMirror 6 + Vite** (upgrade) | A true VS Code-like IDE, programming type safety, and proper autocomplete APIs; serves P4/P5 |
| **Rejected** | Rust, Java, Node-as-backend | Would force re-implementing a Python parser (accuracy risk) or lose native `ast` accuracy |

**Why not Rust/Java/Node-as-a-backend**: the Python phase *requires* CPython's own `ast` parser for 100% accuracy — only a Python backend can bind it natively. Therefore the backend stays Python; the deliberate, high-return upgrade is the *frontend* to **TypeScript**.

---

## 4. User Scenarios & Testing

User stories are written in plain language for stakeholders and are independently testable. Priority P1 is core value; P2 is important quality/lower-priority.

### User Story 1 — Paste any valid C code and see all 4 compiler phases immediately (Priority: P1)

As a user, I want to paste any valid C program into the editor and click Run so that I can see the whole compilation pipeline — tokens, parse tree, symbol table, semantic analysis results, and intermediate code — displayed accurately and nearly instantly.

**Independent test**: Paste `input1.c`, `input2.c`, `input3.c`, and `test.c` into the editor, click Run, and verify that all 4 phases produce correct, non-empty output for each.

**Acceptance scenarios**:
1. **Given** a valid C program with nested `for` loops and `if`/`else` blocks, **When** I click Run, **Then** all 4 phases (Lexical, Syntax, Semantic, IR Generation) complete with correct output.
2. **Given** a valid C program with type conversions (`int` to `float`, `char` to `int`), **When** I click Run, **Then** the semantic phase emits conversion nodes and the IR reflects the conversions.
3. **Given** a valid C program using `printf` and `scanf`, **When** I click Run, **Then** the tokens include the print/scan tokens and the IR includes function-call instructions.
4. **Given** a minimal C program (`int main() { int x = 10; return 0; }`), **When** I click Run, **Then** all 4 phases complete with correct, minimal output.
5. **Given** a C program with multiple declarations and assignments, **When** I click Run, **Then** the symbol table correctly lists all symbols with types, scopes, and values.

### User Story 2 — See a polished, VS Code-native-like IDE that is responsive (Priority: P1)

As a user, I want the IDE to look and feel like a real IDE — smooth tab switching, collapsible panels, keyboard shortcuts, a professional appearance — so that I can focus on code and output without distraction.

**Independent test**: Open the IDE in a browser, verify all UI elements render, exercise keyboard shortcuts, and confirm all panels are functional and responsive.

**Acceptance scenarios**:
1. **Given** the IDE is loaded, **When** I view the layout, **Then** it matches a VS Code-like appearance (title bar, activity bar, file explorer, editor, bottom panel, right panel, status bar including a language selector).
2. **Given** I am in the editor, **When** I press `Ctrl+Enter`, **Then** the compiler runs and results appear in the panels.
3. **Given** the compiler is running, **When** I view the Phase Flow panel, **Then** I see an animated indicator of the current phase.
4. **Given** compilation completed, **When** I click the Tokens tab, **Then** all tokens are shown color-coded by type with line numbers.
5. **Given** compilation completed, **When** I click the Parse Tree tab, **Then** I see a collapsible tree visualization of the parse/AST tree.
6. **Given** compilation completed, **When** I click the Symbol Table tab, **Then** I see a sortable table of symbols (name, type, scope, value, line).
7. **Given** compilation completed, **When** I click the IR code tab, **Then** I see three-address code with line numbers and syntax highlighting.
8. **Given** there are compilation errors, **When** I click the Diagnostics tab, **Then** I see errors/warnings with line numbers and severity indicators.
9. **Given** the IDE is running, **When** I resize the browser window, **Then** the layout adapts without breaking.

### User Story 3 — See accurate, complete compiler output for every phase (Priority: P1)

As a user, I want each compiler phase to produce accurate and complete output so that I can trust the tool for learning compilation.

**Acceptance scenarios**:
1. **Given** `input1.c` (nested loops with `if`/`else`), **When** compiled, **Then** Lexical/Syntax/Semantic/IR phases each show correct, complete structure.
2. **Given** `input2.c` (type conversions), **When** compiled, **Then** the semantic phase detects/reports conversions and the IR shows conversion values.
3. **Given** `input3.c` (duplicate-declaration error), **When** compiled, **Then** the semantic phase reports the error with the correct line number and severity `error`.
4. **Given** `test.c` (minimal program), **When** compiled, **Then** all 4 phases produce correct, minimal output.

### User Story 4 — Compile Python programs through the same 4-phase visualizer (Priority: P1)

As a user, I want to select Python and see the same four-phase visualization so that I can compare how Python compiles vs. C in one tool.

**Independent test**: With `language=python`, paste Python samples (a function, arithmetic, control flow, and a type/scope demo) and verify all four phases.

**Acceptance scenarios**:
1. **Given** a valid Python program with functions, **When** I select Language=Python and click Run, **Then** token list, call/parse tree, symbol table, and IR are produced.
2. **Given** `a = int(input())`-style code, **When** compiled as Python, **Then** the tokenizer shows correct Python tokens and the semantic phase records the symbol.
3. **Given** an indentation-based block, **When** compiled as Python, **Then** indentation is respected as block structure (no braces).
4. **Given** invalid Python code (unclosed, misuse of indentation), **When** compiled, **Then** the diagnostics panel shows a clear, line-numbered error.
5. **Given** a Python expression with types surfaced statically, **When** compiled, **Then** the IR reflects any conversions.

### User Story 5 — Run comprehensive automated tests verifying every compiler phase (Priority: P1)

As a tester, I want automated tests that verify the compiler pipeline for all sample inputs and edge cases so that I can trust the tool is production-ready.

**Independent test**: Run `make test` and verify all tests pass.

**Acceptance scenarios**:
1. **Given** the project is built, **When** I run `make test`, **Then** all tests pass with 0 failures.
2. **Given** the test suite, **When** each sample input is compiled, **Then** the output matches the expected output for all 4 phases.
3. **Given** invalid programs (undeclared variable, syntax error), **When** compiled, **Then** the correctly reporting phase emits the correct error and line.
4. **Given** an empty program, **When** compiled, **Then** it is handled without crashing and shows appropriate empty-state output.
5. **Given** a program with only a preprocessor/include directive, **When** compiled, **Then** the lexer identifies it and the pipeline handles the empty body.

### User Story 6 — Run end-to-end browser tests simulating real user workflows (Priority: P2)

As a QA engineer, I want end-to-end tests that simulate real user interactions in a browser so that the whole system (frontend + backend + compiler) works together.

**Independent test**: Run the end-to-end suite and verify all workflows pass.

**Acceptance scenarios**:
1. **Given** the IDE in a browser, **When** I paste `input1.c` and click Run, **Then** tokens, parse tree, symbol table, and IR all render correctly.
2. **Given** the IDE in a browser, **When** I paste invalid code and click Run, **Then** the Diagnostics panel shows the error and the Phase flow shows the failing phase.
3. **Given** the IDE in a browser, **When** I switch language between C and Python, **Then** the corresponding sample files and rendering appear.
4. **Given** a Python program in a browser, **When** I click Run, **Then** all 4 Python-phase outputs render.
5. **Given** the IDE in a browser, **When** I load a different sample file, **Then** editor content updates and previous results clear.

### User Story 7 — Load sample programs from the file explorer (Priority: P2)

As a user, I want to click sample files in the explorer to load them into the editor for both C and Python.

**Independent test**: Click each sample file and verify the editor content updates.

**Acceptance scenarios**:
1. **Given** the IDE is loaded, **When** I click `hello.c`, **Then** editor content becomes the `hello.c` sample.
2. **Given** the IDE is loaded, **When** I click `factorial.c`, **Then** editor content becomes the `factorial.c` sample.
3. **Given** the IDE is loaded, **When** I click a `.py` sample, **Then** the editor shows that Python sample and the language selector flips to Python.
4. **Given** a loaded sample, **When** the active editor tab updates, **Then** it shows the loaded file name.

### User Story 8 — Auto-complete code as the user types (Tier 1 & 2) (Priority: P1)

As a user, I want context-aware autocomplete (keywords plus declared-symbols) while I type so I can write quickly and discover identifiers, matching the real-IDE feel.

**Independent test**: Type in the editor and verify that suggestions appear from both keywords (Tier 1) and declared symbols (Tier 2).

**Acceptance scenarios**:
1. **Given** I am typing in the C editor, **When** I type a partial keyword (e.g., `int`), **Then** a list of C keywords/control words appears (Tier 1).
2. **Given** I declared `int total = 0;`, **When** I begin typing `tot`, **Then** `total` appears as a suggestion (Tier 2, from the symbol table).
3. **Given** I am in a Python file, **When** I type `def `, **Then** Python keywords (`def`, `return`, `if`, etc.) appear as suggestions.
4. **Given** the cursor/word boundary, **When** I press `Enter`/`Tab` to accept, **Then** the completion inserts the word at the cursor.
5. **Given** a symbol schema, **When** I type a function name already declared, **Then** completion proposes the function signature.
6. **Given** autocomplete is active, **When** suggestions are shown, **Then** the editor does not freeze/lag and completion is interruptible.

### User Story 9 — Handle edge cases and errors gracefully (Priority: P2)

As a user, I want the IDE to handle edge cases and errors without crashing so that it is trustworthy and reliable.

**Acceptance scenarios**:
1. **Given** an undeclared variable, **When** compiled, **Then** the semantic phase reports it with the correct line.
2. **Given** a duplicate declaration, **When** compiled, **Then** the semantic phase reports it with the correct line.
3. **Given** a return-type mismatch, **When** compiled, **Then** the semantic phase reports it with the correct line.
4. **Given** a syntax error, **When** compiled, **Then** the parser reports it and the pipeline stops cleanly.
5. **Given** empty code, **When** compiled, **Then** it is handled with empty state.
6. **Given** a very large program, **When** compiled, **Then** the UI does not freeze (virtual/paginated rendering).
7. **Given** a missing compiler binary, **When** the user clicks Run, **Then** the IDE shows: "Compiler binary not found. Run `make` in the compiler/ folder."
8. **Given** the Flask server is not running, **When** the user clicks Run, **Then** the IDE shows: "Cannot reach Flask server. Run `python3 app.py` in the backend/ folder."

---

## 5. Functional Requirements (FR)

### 5.1 Compiler Pipeline — C
- **FR-001** (P1): The C compiler **must** correctly tokenize all valid C programs, including nested `for` loops, `if`/`else`, `printf`, `scanf`, and arithmetic expressions.
- **FR-002** (P1): The C compiler **must** produce a correct parse tree (derivation/inorder traversal) for all valid C programs. **Operator precedence and associativity must match the C language for every supported operator** — `* / %` bind tighter than `+ -`; relational operators tighter than logical `&& ||`; assignment right-associative. A mis-associated expression (e.g., `a - b - c` evaluated as `a - (b - c)`) is a miscompile and a P1 defect.
- **FR-003** (P1): The C compiler **must** perform semantic analysis: declaration-before-use, duplicate-declaration detection, return-type checking, and type-conversion detection.
- **FR-004** (P1): The C compiler **must** generate correct three-address intermediate code, **including an explicit conversion instruction whenever the semantic phase detects a type conversion (e.g., an int-to-float value used in a float context), and correct control flow expressed with explicit labels and temporaries.**
- **FR-005** (P1): The C compiler **must** report errors with correct line numbers and descriptive messages.
- **FR-006** (P1): The C compiler **must** emit output in a consistent, parsable, section-delimited format shared with the Python pipeline.

### 5.2 Compiler Pipeline — Python
- **FR-007** (P1): The Python analyzer **must** tokenize valid Python including indentation-based blocks, imports, functions, and arithmetic.
- **FR-008** (P1): The Python analyzer **must** build a parse tree/CST using the Python `ast` module.
- **FR-009** (P1): The Python analyzer **must** build a symbol table (functions and variables, with scope and type where statically determinable).
- **FR-010** (P1): The Python analyzer **must** produce an IR-like (three-address) representation for supported constructs.
- **FR-011** (P1): The Python analyzer **must** report syntax errors and a limited set of static semantic issues with line numbers.
- **FR-012** (P1): The Python analyzer **must** emit output using the same consistent section-header format as the C pipeline.

### 5.3 Backend API
- **FR-013** (P1): The `/api/compile` endpoint **must** accept `{ code, language }` where `language` is either `c` or `python`.
- **FR-014** (P1): The `/api/compile` endpoint **must** route to the correct pipeline based on `language`.
- **FR-015** (P1): The `/api/compile` response **must** include: `success`, `language`, `tokens`, `parse_tree`, `symbol_table`, `ir_code`, `errors`, `warnings`, `phases`, `raw_output`.
- **FR-016** (P1): Every error object **must** include `level`, `message`, `line`, and `col`. **`line` and `col` must point at the token/construct that triggered the diagnostic and must be verified by a test asserting the exact position (a wrong line or column is a P1 defect).**
- **FR-017** (P1): The `/api/tokenize` endpoint **must** return tokens even when the full pipeline fails.
- **FR-018** (P1): The `/api/status` endpoint **must** report whether the required backends are ready per language.
- **FR-019** (P1): The backend **must** enforce a 10-second timeout per compilation request.
- **FR-020** (P1): The backend **must** clean up temporary files after each compilation.

### 5.4 Backend API — Error Model & Status Codes
- **FR-021** (P1): The `/api/compile` endpoint **must** return HTTP `200` for a successful compilation and `400` for malformed/unprocessable request bodies.
- **FR-022** (P1): The endpoint **must** return HTTP `504` when a compilation times out at the 10-second limit, with an error body level `error` and a clear timeout message.
- **FR-023** (P1): The endpoint **must** return HTTP `502` with the instructional message when a required backend is unavailable (compiler binary missing / server down).
- **FR-024** (P1): The endpoint **must** never crash on empty or non-C/Python input; it **must** return HTTP `200` with `success: false` and a keyword diagnostics payload such that the frontend renders empty-state output.

### 5.5 Auto-completion (Tier 1 & Tier 2)
- **FR-025** (P1): Tier 1 (keyword) completion **must** propose language keywords/control words for the active language.
- **FR-026** (P1): Tier 2 (symbol) completion **must** propose identifiers already declared, sourced from the symbol table.
- **FR-027** (P1): Completion **must** trigger on typing, present as a dropdown at the cursor, and be accepted via `Enter`/`Tab`.
- **FR-028** (P1): Completion **must** be fully deterministic and local — no network or API calls (no Tier 3).
- **FR-029** (P1): Completion **must** support both C and Python by selecting the keyword/symbol set per active language.

### 5.6 Frontend IDE
- **FR-030** (P1): The IDE **must** display a VS Code-like layout: title bar, activity bar, file explorer, editor, bottom panel, right panel, status bar.
- **FR-031** (P1): The status bar **must** show the active language and a C/Python language selector.
- **FR-032** (P1): The editor **must** use CodeMirror with syntax highlighting, line numbers, bracket matching, and auto-close brackets.
- **FR-033** (P1): The editor **must** support `Ctrl+Enter` to run compilation.
- **FR-034** (P1): The Run button **must** show a loading state while compiling.
- **FR-035** (P1): The Phase flow panel **must** show animated phase indicators (Waiting → Running → Done → Error).
- **FR-036** (P1): The Tokens panel **must** color-code tokens by type with line numbers.
- **FR-037** (P1): The Parse Tree panel **must** show a collapsible tree representation of the parse tree emitted by the pipeline — the parser's derivation tree, including its semantic annotations (e.g., `inttofloat`, `CONDITION`, `ITERATOR`). The panel must render exactly what the parser produces, never a fabricated or synthetic tree.
- **FR-038** (P1): The Symbol Table panel **must** show a sortable table (name, type, scope, value, line), where **`value` is the compile-time constant initializer when one is statically determinable and `null` otherwise** (a mutable variable whose value is not statically known must show `null`, never a guessed value).
- **FR-039** (P1): The IR Code panel **must** show three-address code with line numbers and syntax highlighting.
- **FR-040** (P1): The Diagnostics panel **must** show errors/warnings with severity icons, line numbers, and colors.
- **FR-041** (P1): The file explorer **must** load both C and Python samples.
- **FR-042** (P1): The IDE **MUST** show empty-state messages before any run.
- **FR-043** (P1): The IDE **must** toast on compile success/failure.
- **FR-044** (P1): The IDE **must** handle connection errors gracefully (server down / binary missing), mapping each to a clear user-facing message.

### 5.7 Frontend Build & Deployment
- **FR-045** (P1): The frontend build (npm/Vite) **must** produce a deterministic, versioned static bundle committed for reproducibility.
- **FR-046** (P1): The Flask backend **must** serve the built frontend bundle as a static single-page app and route unknown routes to `index.html`.
- **FR-047** (P2): The frontend build **must** be reproducible from a clean checkout using documented, pinned tooling versions.

### 5.8 Build & Deployment (repo-level)
- **FR-048** (P1): A root `Makefile` **MUST** provide targets `all`, `setup`, `run`, `test`, `clean`.
- **FR-049** (P1): `compiler/Makefile` **MUST** run `lex`, `yacc`, and `gcc` to produce the C compiler binary.
- **FR-050** (P1): `make setup` **MUST** create a venv, install Python dependencies, and install pinned frontend tooling.
- **FR-051** (P1): `make run` **MUST** build the frontend (if changed) and start the Flask (or FastAPI) server serving the built UI.
- **FR-052** (P1): `make test` **MUST** run all automated tests (C, Python, integration, frontend, E2E).
- **FR-053** (P1): `make clean` **MUST** remove all generated files.
- **FR-054** (P1): The root README **MUST** include project description, multi-language usage, build instructions, and screenshots.
- **FR-055** (P1): The project **MUST** provide `make run-prod` that serves the SPA under a production WSGI server with `debug=False` (no `app.run(debug=True)` in the deployed path).
- **FR-056** (P1): The backend **MUST** restrict CORS to the configured serving origin(s) and emit appropriate security headers (never a wide-open wildcard origin).
- **FR-057** (P1): A CI workflow **MUST** run `make test` on pushes/PRs after a clean-environment bootstrap (pip + `npm ci`), enforcing reproducibility.
- **FR-058** (P1): The compile service **MUST** enforce a concurrency guard/rate limit and a request-body size bound so subprocess execution cannot be abused.

### 5.9 Supported Language Subset (grammar boundary — source of truth for testability)

**C subset (P1)** — constructs that MUST compile and render all 4 phases:
- Structure: an **optional** `#include` preprocessor section followed by exactly one `main()` function with no parameters. **A program without any header is valid** (so the minimal `int main() { int x = 10; return 0; }` program must compile).
- Declarations: `int`, `char`, `float`; single and multiple variables per statement; initializers.
- Expressions: arithmetic (`+ - * / %`), relational (`< <= > >= == !=`), logical (`&& || !`), assignment (`=`), increment/decrement (`++ --`), parentheses, integer/float literals, char literals, identifiers — **with C-standard precedence and associativity (FR-002)**.
- Statements: expression statements, `if` / `else`, `while`, `for`, `do-while`, `return`, `break`, `continue`.
- Functions: a single `main()` (required, no parameters, any supported return type). **Calls are limited to the fixed forms `printf("<string>");` and `scanf("<string>", &id);`. User-defined functions and user-function calls with arguments (including recursion) are NOT supported in this release** and must produce a clear diagnostic.
- Comments: `//` and `/* */` — **line numbers must remain correct across multi-line block comments**.

**C subset — explicitly NOT supported (MUST produce a clear unsupported-feature error, not miscompile):**
- `struct`, `union`, `enum`, `typedef`, `#define` bodies, pointers `*`, arrays `[]`, `switch`/`case`/`goto`, `static`/`extern`, `double`, string literals (outside the fixed `printf`/`scanf` forms), nested functions, user-defined functions, variadic functions, type qualifiers (`const`, `volatile`), multi-scope shadowed identifiers (single global+function scope), recursive functions, octal/hex literals, `unsigned`/`long`/`short`.

**Python subset (P2)** — constructs that MUST analyze correctly:
- Tokens: identifiers, numbers, strings, operators, indentation-produced `NEWLINE`/`INDENT`/`DEDENT`.
- Statements: `def`, `return`, `if`/`elif`/`else`, `while`, `for ... in`, `break`, `continue`, `import` (module-level, reported but not fully resolved), assignment, arithmetic/comparison/logical expressions, `print`.
- Type info recorded when statically deterministic (int/float/str from literals).

**Python subset (NOT supported → clear error or documented static-warning):**
- Full-fidelity name resolution across modules; classes, decorators, comprehensions, lambdas, generators, `async`/`await`, `yield`, `with`, `try/except` (reported at parse), f-strings (tokenized but flagged), dynamic type inference beyond literals.

This matrix is the **exact contract** for "100% accuracy": a sample is "valid" if and only if it is inside the supported subset for its language. Any supported-construct miscompilation is a P1 bug; any unsupported construct must surface a clear diagnostic rather than misleading output.

### 5.10 Sample Program Catalog (acceptance contract)

- **FR-059** (P1): The project **must** ship a sample-program catalog containing at least `hello.c`, `arithmetic.c`, `factorial.c`, `input1.c`, `input2.c`, `input3.c`, `test.c` (C) and `hello.py`, `functions.py` (Python). **Every sample MUST be inside the §5.9 supported subset for its language — a shipped sample the pipeline cannot fully process is a P1 defect.** The catalog is the acceptance contract for User Stories 1, 3, 4, and 7, and its expected outputs are golden-locked by the test suite.

---

## 6. Key Entities

- **Compiler Pipeline (C)**: lexer → parser → semantic → IR, via the Lex/Yacc/GCC-built C binary.
- **Python Analysis Pipeline**: tokenizer → `ast` parse → symbol table → IR (in-process Python).
- **Unified Compile Runner**: dispatches by `language` to the correct pipeline and returns one response.
- **API Contract**: `{ code, language }` ⇒ `{ success, language, tokens, parse_tree, symbol_table, ir_code, errors, warnings, phases, raw_output }`.
- **Output Protocol**: shared section headers shared across C and Python for the backend parser.
- **Symbol Table**: the source of truth for Tier 2 completion and the Symbol Table panel.
- **Autocomplete Tiers**: Tier 1 = keywords; Tier 2 = symbol table; Tier 3 (AI) deferred.
- **IDE State**: editor content, active language, active tabs, compile results, phase states.
- **Sample Programs**: C inputs (`input1.c`, `input2.c`, `input3.c`, `test.c`, `hello.c`, `factorial.c`, `arithmetic.c`) and accompanying Python samples, **all within the §5.9 supported subset**.
- **Supported Language Subset**: the exact contract (§5.9) defining which constructs compile vs. which produce diagnostics — the source of truth for testability and "100% accuracy".

---

## 7. Success Criteria (measurable)

- **SC-001**: A new user can clone the repo, run `make`, open the IDE, select C or Python, paste a program, click Run, and see 4 non-empty correct phase outputs in under 5 minutes.
- **SC-002**: `make test` passes with 0 failures for all C and Python samples and all edge cases.
- **SC-003**: The C pipeline produces correct output for 100% of sample inputs **within the §5.9 supported subset**, and every unsupported construct produces a clear diagnostic (never a miscompile).
- **SC-004**: The Python pipeline produces correct output for 100% of Python samples **within the §5.9 supported subset**, and every unsupported construct produces a clear diagnostic.
- **SC-005**: C and Python compile correctly in the same session; the regression suite covers both.
- **SC-006**: Auto-completion (Tier 1 & Tier 2) works in both languages and never uses network/API calls.
- **SC-007**: The IDE handles every error case (invalid code, missing binary, server down) without crashing.
- **SC-008**: All 9 user stories are independently testable and pass.
- **SC-009**: `make clean && make` rebuilds the entire project from scratch successfully.
- **SC-010**: For any supported-subset input in either language, all 4 phase outputs are fully rendered within **2 seconds** of the user clicking Run (verified by the E2E suite).

---

## 8. Exclusions and Assumptions

### 8.1 Assumptions
- Python 3.12 is available (an existing `venv/` exists in the repo).
- The Flask/FastAPI server runs on port 5000.
- The C compiler binary is named `compiler`, with `a.out` as a fallback.
- The Python `ast` module is available in the stdlib (no extra dependency).
- The frontend is served as a static SPA (likely a single HTML bundle).
- The Lex/Yacc/GCC toolchain is available on the target systems.
- The project targets Linux/macOS (the Makefile and scripts assume a Unix-like environment).
- The C grammar may contain shift/reduce conflicts (e.g., dangling-else); **every conflict must be resolved so that operator precedence and associativity match the C language (FR-002), and any remaining conflict must be documented per-construct in `compiler/README.md` and verified by a dedicated test. A conflict that changes the value of a supported expression is a miscompile and is unacceptable.**
- Multi-scope tracking for symbols exists for both C and Python (required for Tier 2).

### 8.2 Exclusions / Out of Scope (this feature)
- **Tier 3 (AI/LLM) auto-completion** is explicitly out of scope; deterministic Tier 1 & Tier 2 only. A future separate spec may add it.
- C++, Java, Go, or other languages — added later as separate specs.
- Remote/multi-user collaboration.
- Full-fidelity compiled program execution (the tool visualizes compilation, not runtime execution).

---

## 9. Edge Cases

- **Empty program** (either language) → handled with empty state.
- **Undeclared variable / duplicate declaration** → semantic error with line.
- **Return type mismatch** → semantic error with line.
- **Syntax error** → parser error, clean stop.
- **Python:** unclosed string, misuse of indentation, out-of-scope name → clear error.
- **Missing compiler binary** → clear error + instruction.
- **Server not running** → clear error + instruction.
- **Compilation timeout (10s)** → timeout error.
- **Very large C/Python file** → non-freezing virtualized rendering at the defined boundary (5,000+ tokens / 2,000+ lines).
- **Non-C/non-Python content pasted** → appropriate syntax errors.

---

## 10. Test Plan

The following test tiers are required. Each maps to user stories and FRs.

1. **Unit tests** — each compiler phase and backend handler in isolation (FR-001…FR-059).
2. **Integration tests** — backend `compile`/`tokenize`/`status` endpoints against sample inputs; output of every phase validated against expected, INCLUDING the symbol-table columns (name, type, scope, value, line) for both C and Python.
3. **Regression test suite (C + Python)** — `make test` runs all of the above; covers every supported-subset construct in §5.9 and every edge case in §9; driver for the P1–P3 gates.
4. **Large-programs test** — verify the UI stays responsive on inputs at the §9 large-file boundary (e.g., 5,000+ tokens / 2,000+ lines) with no freeze and correct virtualized rendering.
5. **End-to-end (E2E) browser tests** — simulate user workflows (§4, User Stories 6 & 9) in a real browser; driver for the P5 gate.
6. **Acceptance verification** — every User Story scenario in §4 is checked manually or automatically and recorded as passing.

---

## 11. Definition of "Done" (per release)

A phase is done when all the following hold:
- Its automated tests pass with 0 failures (`make test`).
- Every relevant acceptance scenario in §4 is green.
- The tangible success criteria in §7 are satisfied.
- `make clean && make` builds from scratch in a clean clone.
- The IDE no-crash baseline is validated (no crash for any unacceptable input).

---

## 12. Verification Notes (self-checked — no external review)

This "quality" section is intentionally final and internal-complete to keep the spec standalone. Every item is fully contained here.

**Checklist (self-assessment)**
- Purpose and product boundary stated (Overview).
- Technical decision documented and justified (Technology Stack; §3).
- User stories for all key actors with concrete scenarios and independent tests (§4).
- Functional requirements enumerated (FR-001…FR-059) (§5).
- Priority labeled on every FR (P1/P2) — all requirements carry explicit priority.
- Success criteria are measurable (§7).
- Supported language subset explicitly bounded for both C and Python (§5.9), making "100% accuracy" testable.
- Assumptions, exclusions, and edge cases enumerated (§8, §9).
- Test strategy defined (§10).
- Phase-gated delivery roadmap defined (§2).
- No TODO/anomaly markers left — all spans concrete.
- The document is a single, self-contained file with no external links.

The spec is ready for the planning stage (`/sp.plan`).

---

*End of specification — the entire feature definition, requirements, criteria, exceptions, and verification live solely in this one file.*