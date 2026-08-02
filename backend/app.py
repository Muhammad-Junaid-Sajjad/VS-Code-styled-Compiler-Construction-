import os
import re
import json
import time
import logging
import threading
from flask import Flask, request, jsonify
from flask_cors import CORS

from compiler_runner import run_compiler, check_compiler_status
from lexer_parser    import parse_compiler_output
from tree_builder    import build_tree
from contract import CompileResponse, Phases, LANGUAGES

# ─────────────────────────────────────────────────────────────────────────────
#  Flask app setup
#  CORS is widened here only for local dev; tightened to an allowlist in T054b.
# ─────────────────────────────────────────────────────────────────────────────

app = Flask(__name__)
CORS(app)

# 1 MB request-body cap → Flask returns HTTP 413 automatically (T013 / FR-058)
app.config['MAX_CONTENT_LENGTH'] = 1_000_000

# Structured logging (T014 / plan §8.2) — never log source code (student code is private).
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger('compileviz')

# Concurrency guard (T015b / FR-058): one subprocess compile at a time; 429 when busy.
_compile_lock = threading.Lock()


# ─────────────────────────────────────────────────────────────────────────────
#  ROUTE: GET /api/status   (FR-018 — per-language readiness)
# ─────────────────────────────────────────────────────────────────────────────

@app.route('/api/status', methods=['GET'])
def status():
    info = check_compiler_status()
    return jsonify({
        'server'   : 'running',
        'languages': {
            'c'     : {'ready': info['binary_found'], 'compiler': info},
            'python': {'ready': True},   # stdlib `ast`/`tokenize` always present
        },
        'message': (
            'Compiler binary found — ready to compile.'
            if info['binary_found']
            else 'WARNING: Compiler binary not found. Run `make` in compiler/ folder.'
        )
    })


# ─────────────────────────────────────────────────────────────────────────────
#  ROUTE: POST /api/compile  (FR-013…FR-024)
#  Request:  { "code": "...", "language": "c" | "python" }
#  Success:  200 + full schema-valid payload
#  400: malformed JSON / missing `code` / bad `language`
#  502: backend/compiler unavailable (binary missing / server down)
#  504: timeout at 10 s
#  200 + success:false: empty input (empty-state-safe payload)
# ─────────────────────────────────────────────────────────────────────────────

@app.route('/api/compile', methods=['POST'])
def compile_code():

    # ── 1. Validate request body ──────────────────────────────────────────────
    data = request.get_json(silent=True)
    if not data or not isinstance(data, dict) or 'code' not in data:
        return jsonify({'success': False,
                        'error': 'Request body must be JSON with a "code" field.'}), 400

    language = data.get('language', 'c')
    if language not in LANGUAGES:
        return jsonify({'success': False,
                        'error': f"Unsupported language '{language}'. Use 'c' or 'python'."}), 400

    source_code = data['code']
    if not isinstance(source_code, str) or not source_code.strip():
        # FR-024: empty input → HTTP 200 + success:false (NOT 400)
        return jsonify(_empty_response(language)), 200

    # ── 2. Run compiler binary (C pipeline; Python routes in P2) ─────────────
    start = time.perf_counter()

    if not _compile_lock.acquire(blocking=False):
        # FR-058 / T015b: a compile is already in flight — refuse politely.
        return jsonify({'success': False,
                        'error': 'Another compilation is in progress. Try again shortly.'}), 429

    try:
        run_result = run_compiler(source_code)

        # Fatal runner errors: binary missing → 502; timeout → 504 (FR-022/FR-023)
        if run_result['error_msg']:
            status_code = 504 if 'timed out' in run_result['error_msg'].lower() else 502
            body = CompileResponse(
                success=False,
                language=language,
                errors=[{'level': 'error', 'message': run_result['error_msg'], 'line': 0, 'col': 0}],
                phases=Phases('error', 'error', 'error', 'error'),
            ).to_dict()
            _log_compile(language, False, status_code, start, 0, 1, 0)
            return jsonify(body), status_code

        # ── 3. Parse compiler output → structured data ───────────────────────
        parsed = parse_compiler_output(
            stdout  = run_result['stdout'],
            stderr  = run_result['stderr'],
            success = run_result['success'],
        )

        # ── 4. Build parse tree ──────────────────────────────────────────────
        parse_tree = build_tree(
            raw_text = _extract_tree_section(run_result['stdout']),
            tokens   = parsed['tokens'],
        )

        # ── 5. Build and return response ─────────────────────────────────────
        response = CompileResponse(
            success     = run_result['success'],
            language    = language,
            tokens      = parsed['tokens'],
            parse_tree  = parse_tree,
            symbol_table= parsed['symbol_table'],
            ir_code     = parsed['ir_code'],
            errors      = parsed['errors'],
            warnings    = parsed['warnings'],
            phases      = Phases(**{k: parsed['phases'].get(k, 'done') for k in ('lexer', 'parser', 'semantic', 'irgen')}),
            raw_output  = run_result['stdout'],
        )

        # If compiler succeeded but produced no token stream, fall back to the
        # regex tokeniser so the Tokens panel is never empty (GAP-B resolution).
        if run_result['success'] and not response.tokens:
            from lexer_parser import _fallback_tokenise
            response.tokens = _fallback_tokenise(source_code)

        _log_compile(language, response.success, 200, start,
                     len(response.tokens), len(response.errors), len(response.warnings))
        return jsonify(response.to_dict()), 200

    finally:
        _compile_lock.release()


# ─────────────────────────────────────────────────────────────────────────────
#  ROUTE: POST /api/tokenize  (FR-017 — returns tokens even when full pipeline fails)
# ─────────────────────────────────────────────────────────────────────────────

@app.route('/api/tokenize', methods=['POST'])
def tokenize_only():
    data = request.get_json(silent=True)
    if not data or not isinstance(data, dict) or 'code' not in data:
        return jsonify({'success': False, 'error': 'Missing "code" field.'}), 400

    from lexer_parser import _fallback_tokenise
    tokens = _fallback_tokenise(data['code'])
    return jsonify({'success': True, 'tokens': tokens})


# ─────────────────────────────────────────────────────────────────────────────
#  HELPERS
# ─────────────────────────────────────────────────────────────────────────────

_TREE_SECTION_RE = re.compile(
    r'(parse\s*tree|syntax\s*tree|AST|abstract\s*syntax)', re.I
)


def _extract_tree_section(stdout: str) -> str:
    """Find the parse-tree section in raw compiler output ('' if not found)."""
    lines       = stdout.splitlines()
    in_section  = False
    buf         = []

    for line in lines:
        if _TREE_SECTION_RE.search(line):
            in_section = True
            continue
        if in_section:
            if re.match(r'^={3,}|^-{3,}', line.strip()):
                break
            buf.append(line)

    return '\n'.join(buf).strip()


def _log_compile(language: str, success: bool, http_status: int,
                 start: float, token_count: int, error_count: int, warning_count: int) -> None:
    """T014 / plan §8.2 — structured log per compile. NEVER logs source code."""
    logger.info(json.dumps({
        'event': 'compile',
        'language': language,
        'success': success,
        'http_status': http_status,
        'latency_ms': round((time.perf_counter() - start) * 1000, 1),
        'token_count': token_count,
        'error_count': error_count,
        'warning_count': warning_count,
    }))


def _empty_response(language: str) -> dict:
    """FR-024: empty/unsupported input → HTTP 200 + success:false, empty-state safe."""
    return CompileResponse(
        success     = False,
        language    = language,
        tokens      = [],
        parse_tree  = {'label': 'Program', 'cls': 'tl-prog', 'children': []},
        symbol_table= [],
        ir_code     = [],
        errors      = [{'level': 'error', 'message': 'Source code is empty.', 'line': 0, 'col': 0}],
        warnings    = [],
        phases      = Phases('error', 'error', 'error', 'error'),
        raw_output  = '',
    ).to_dict()


# ─────────────────────────────────────────────────────────────────────────────
#  ENTRY POINT (dev server; replaced by `make run-prod`/WSGI in T054a)
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    print("\n" + "=" * 55)
    print("  CompileViz IDE — Backend Server")
    print("=" * 55)

    info = check_compiler_status()
    if info['binary_found']:
        print(f"  ✅ Compiler binary : {info['binary_path']}")
    else:
        print(f"  ⚠️  Compiler binary NOT found in: {info['compiler_dir']}")
        print("     Run `make` inside the compiler/ folder first.")

    print("  🌐 Server starting  : http://localhost:5000")
    print("  📡 Endpoints ready  :")
    print("       GET  /api/status")
    print("       POST /api/compile   (language: c | python)")
    print("       POST /api/tokenize")
    print("=" * 55 + "\n")

    app.run(host='0.0.0.0', port=5000, debug=True)  # dev default; T054a removes debug=True
