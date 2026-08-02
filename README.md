<div align="center">

# ⚡ CompileViz IDE

### The VS Code–style Compiler-Construction Visualizer — C & Python, 4 phases, real execution

**Watch your code compile in the browser.** Lexical → Syntax → Semantic → Intermediate Code (IR), plus a real `gcc`/`python3` **terminal** that actually runs your programs.

`Python 3.12` · `Lex/Yacc/GCC` · `TypeScript · CodeMirror 6 · Vite`

</div>

---

## ✨ What is CompileViz?

CompileViz is a **production-ready, browser-based IDE** for learning compiler construction. Paste a real **C** or **Python** program and watch the entire compilation pipeline run end-to-end — with every phase visualized, categorized, and explained — then **execute** it in a real terminal.

It is built for **university classrooms**: output is canonical, deterministic, and accurate **within a bounded, testable language subset** (spec §5.9), so students learn the textbook pipeline — not a black box.

| | |
|---|---|
| 🔤 **Lexical Analysis** | Every lexeme as a real token, fully classified: `DATATYPE int · IDENTIFIER x · OPERATOR = · NUMBER 5 · DELIMITER ;` — with a live token count. |
| 🌳 **Syntax Analysis** | A proper derivation tree of the grammar, collapsible in the panel. |
| 🔍 **Semantic Analysis** | Categorized symbol table (DATATYPE / KEYWORD / OPERATOR / DELIMITER / VARIABLE / FUNCTION / CONSTANT), declaration & type checks, exact line diagnostics. |
| ⚙️ **IR Generation** | Canonical three-address code with explicit temporaries, labels, and control flow. |
| 💻 **Real Execution** | A VS Code–grade **terminal** that really runs your code: `gcc -Wall` for C, `python3` for Python — output, exit codes, errors in red. |

---

## 🚀 Quickstart

```bash
# 1) One-shot reproducible setup: venv + pip deps + frontend deps (npm ci) + C compiler
make setup
make                     # build the C compiler binary (compiler/compiler)

# 2) Run the dev server → open http://localhost:5000
make run

# 3) Production mode (Waitress, debug=False)
make run-prod
```

Then in the IDE: pick a sample from the explorer → **▶ Run Compiler** to visualize the 4 phases, or **▶ Execute** to really compile & run it in the terminal.

**Terminal commands** (type them in the TERMINAL tab):

```text
help            list all commands
run             compile & run the current code (gcc / python3)
run hello.py    load & run a sample
samples         list all samples
compile         run the 4-phase compiler
lang c|py       switch language
theme           toggle light/dark
clear           clear the terminal
```

---

## 🧭 Features

- **Full 4-phase visualization** for C (Lex/Yacc/GCC) and Python (stdlib `tokenize` + `ast`) — identical output schema across both languages.
- **Classic compiler output**: real token stream (`CLASS / LEXEME / LINE`), categorized symbol table, derivation tree, three-address IR.
- **VS Code–grade IDE**: activity bar, file explorer, CodeMirror 6 editor (C/Python modes, bracket matching, auto-close), bottom + right panels, status bar, light/dark theme.
- **Resizable panels**: drag the border handles to resize the explorer, side, and bottom panels — just like VS Code.
- **Real execution terminal**: gcc compilation with real diagnostics, program output, exit codes, command history, maximize, clear — interactive typed-command shell.
- **Tier 1 & Tier 2 autocomplete** (keywords + declared symbols) — fully local and deterministic, zero network.
- **Sortable symbol table**, collapsible parse tree, exact line/col diagnostics.
- **Reproducible build** with pinned toolchains, `make test` runs pytest + vitest + Playwright.

---

## 🏗️ Architecture

```
compiler/   C pipeline — lexer.l (Lex) + parser.y (Yacc) → PHASE 0–4 text output
backend/    Flask service: /api/compile · /api/run · /api/tokenize · /api/status
            contract.py (shared schema) · compiler_runner · code_runner (real exec)
            lexer_parser · tree_builder · python_analyzer (tokenize+ast)
frontend/   TypeScript + CodeMirror 6 + Vite SPA (vanilla-DOM, zustand store)
e2e/        Playwright specs (UI coverage, real execution, SC-010 timing)
specs/      Feature docs: spec.md (FR-001…FR-059, SC-001…SC-010), plan.md, tasks.md
history/    Prompt History Records (SDD)
```

**Pipeline contract** — one canonical response for both languages:

```json
{ "success", "language", "tokens", "parse_tree", "symbol_table",
  "ir_code", "errors", "warnings", "phases", "raw_output" }
```

**Security posture** (submitted code is untrusted): 10 s timeout · resource/address-space caps · output cap · isolated temp dirs with cleanup · **no shell interpolation** · CORS allowlist · security headers · concurrency guard · 1 MB request bound.

---

## 🧪 Testing

```bash
make test          # pytest (backend) + vitest (frontend) + Playwright (E2E)
make lint          # ruff + tsc --noEmit
make check         # lint + test
```

- **Backend** (60 tests): pipeline goldens, precedence/associativity, semantic errors, subset boundary, output fidelity, schema parity, security hardening, catalog gate, Python type-hinting.
- **Frontend** (11 tests): client transport, autocomplete, explorer, symbol table.
- **E2E** (14 tests): every sample compiles, every tab/button/toggle, resizable panels, token count, real C & Python execution in the terminal, interactive shell commands, SC-010 (all 4 phases render < 2 s).
- CI (GitHub Actions) runs `make test` on push/PR from a clean bootstrap.

---

## 📦 Supported Language Subset

The accuracy contract lives in `specs/001-project-foundation/spec.md` §5.9: a sample is **valid iff it is inside the supported subset**; every out-of-subset construct must produce a **clear diagnostic — never a silent miscompile**.

- **C:** `int/char/float`, arithmetic (`+ - * / %`), relational & logical, `if/else`, `for`, `while`, `do-while`, `return`, `printf`/`scanf` (fixed forms), optional headers, comments with correct line tracking, C-standard precedence/associativity.
- **Python:** functions, `if/elif/else`, `while`, `for … in`, `break`/`continue`, `import`, `print`, arithmetic/comparison/logical, **type-hinted code** (`def f(x: int) -> str:`, `x: int = 5`) — parsed and analyzed without crashing.

---

## 📚 Project Structure

| Path | Purpose |
|------|---------|
| `specs/001-project-foundation/` | spec (source of truth) · plan · tasks · checklists |
| `compiler/` | Lex/Yacc C core + build ground-truth Makefile |
| `backend/` | Flask service, pipelines, real-execution runner, tests |
| `frontend/` | TS + CodeMirror 6 + Vite SPA, panels, terminal, tests |
| `e2e/` | Playwright end-to-end specs |
| `.github/workflows/ci.yml` | CI: `make test` on push/PR |

---

## 🤝 Contributing

1. **Build truth:** the `compiler/Makefile` recipe is authoritative — `lex lexer.l; yacc -d -v parser.y; gcc -w -o compiler y.tab.c` (**no `-ll`**; it links `libl`'s `main` and fails). The binary reads source from **stdin**.
2. Work from `specs/…/tasks.md`; each task carries file paths and acceptance checks.
3. Run `make test` before pushing — all suites must be green.

---

## 📄 License

See [`compiler/LICENSE`](compiler/LICENSE).

<div align="center"><sub>Built with the Spec-Driven Development workflow — every exchange recorded in <code>history/prompts/</code>.</sub></div>
