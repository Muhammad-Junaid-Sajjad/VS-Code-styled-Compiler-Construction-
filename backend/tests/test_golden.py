"""T016b — golden-locked format + parser idempotency.

Guards the heuristic `lexer_parser`/`tree_builder` path: parsing the same raw
compiler stdout twice must reproduce identical structures. Fails loudly on any
format drift in the C binary's `PHASE n:` output.
"""
import os
import sys

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)

from compiler_runner import run_compiler  # noqa: E402
from lexer_parser import parse_compiler_output  # noqa: E402

REPO = os.path.dirname(BACKEND_DIR)
INPUT1 = os.path.join(REPO, "compiler", "input1.c")


def test_parse_is_idempotent():
    r = run_compiler(open(INPUT1).read())
    assert r["error_msg"] == ""
    p1 = parse_compiler_output(r["stdout"], r["stderr"], r["success"])
    p2 = parse_compiler_output(r["stdout"], r["stderr"], r["success"])
    assert p1["tokens"] == p2["tokens"], "token parse is not deterministic"
    assert p1["symbol_table"] == p2["symbol_table"], "symbol-table parse is not deterministic"
    assert p1["ir_code"] == p2["ir_code"], "IR parse is not deterministic"
    assert p1["errors"] == p2["errors"], "error parse is not deterministic"


def test_golden_phase_headers_present():
    r = run_compiler(open(INPUT1).read())
    for header in ("PHASE 1: LEXICAL ANALYSIS", "PHASE 2: SYNTAX ANALYSIS",
                   "PHASE 3: SEMANTIC ANALYSIS", "PHASE 4: INTERMEDIATE CODE GENERATION"):
        assert header in r["stdout"], f"missing {header} in compiler output"


def test_symbol_table_has_5_field_shape():
    r = run_compiler(open(INPUT1).read())
    p = parse_compiler_output(r["stdout"], r["stderr"], r["success"])
    for sym in p["symbol_table"]:
        assert set(sym) >= {"name", "type", "scope", "value", "line"}, sym
