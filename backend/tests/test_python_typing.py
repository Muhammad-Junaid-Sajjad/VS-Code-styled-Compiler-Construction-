"""Type-hinted Python analysis (T013/live-testing) — annotations must parse,
record in the symbol table, and never crash; bad annotation syntax → error."""
import os
import sys

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)

from python_analyzer import analyze_python  # noqa: E402


def test_typed_function_parses():
    d = analyze_python("def add(a: int, b: int) -> int:\n    return a + b\nx = add(1, 2)\n")
    assert d["success"] is True
    names = [s["name"] for s in d["symbol_table"]]
    assert "add" in names and "x" in names


def test_annotated_assignment_records_symbol():
    # Regression: `x: int = 5` (AnnAssign) was missing from the symbol table.
    d = analyze_python("x: int = 5\ny: str = 'hi'\n")
    assert d["success"] is True
    syms = {s["name"]: s for s in d["symbol_table"]}
    assert syms["x"]["type"] == "int", syms
    assert syms["x"]["value"] == "5"
    assert syms["y"]["type"] == "str"


def test_modern_generic_annotations():
    d = analyze_python("def g(x: list[int], y: dict[str, int]) -> tuple[int, int]:\n    return (1, 2)\n")
    assert d["success"] is True
    assert any(s["name"] == "g" for s in d["symbol_table"])


def test_annotated_var_then_use_no_warning():
    d = analyze_python("x: int\ny = x + 1\n")
    assert d["success"] is True
    assert not any("x" in w["message"] for w in d["warnings"]), "x is defined via annotation"


def test_bad_annotation_syntax_reports_error():
    d = analyze_python("def f(x: -> int:\n    return x\n")
    assert d["success"] is False
    assert d["errors"]
