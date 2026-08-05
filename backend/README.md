# CompileViz — Backend (Flask API)

The JSON HTTP service that powers the CompileViz IDE. It compiles **C** (via the native
Lex/Yacc binary in `compiler/`) and **Python** (via stdlib `tokenize` + `ast`), and returns
one canonical schema for both — plus a real **execution** endpoint that runs programs.

## Endpoints

| Method | Path             | Purpose                                                                  |
|--------|------------------|--------------------------------------------------------------------------|
| GET    | `/api/status`    | Per-language readiness (compiler binary found? Python always ready).     |
| POST   | `/api/compile`   | Full 4-phase result: `tokens`, `parse_tree`, `symbol_table`, `ir_code`, errors, warnings, phases. |
| POST   | `/api/tokenize`  | Token stream only (works even when the full pipeline fails).             |
| POST   | `/api/run`       | **Real execution**: `gcc -Wall` for C, `python3` for Python → output, exit code. |

All requests are JSON: `{ "code": "...", "language": "c" | "python" }`.

## Files

- `app.py` — Flask routes, CORS allowlist, security headers, concurrency guard, structured logging.
- `compiler_runner.py` — shells out to `compiler/compiler` (stdin → stdout) with timeouts,
  resource caps, and temp-dir cleanup. Never interpolates user code into a command line.
- `code_runner.py` — real `gcc` / `python3` execution for the terminal.
- `lexer_parser.py` — parses raw compiler text into structured tokens / symbols / IR;
  includes the regex fallback tokeniser.
- `tree_builder.py` — builds the collapsible derivation tree.
- `python_analyzer.py` — Python pipeline (stdlib `tokenize` + `ast`) with the same schema.
- `contract.py` — shared response contracts + supported languages.
- `wsgi.py` — production entrypoint (Waitress, debug off).
- `tests/` — 60 pytest tests (pipeline goldens, precedence, semantic, schema parity, security…).

## Run

```bash
# from repo root
make run        # dev server → http://localhost:5000
make run-prod   # Waitress production server
```

## Test

```bash
venv/bin/python -m pytest backend/tests -q
```
