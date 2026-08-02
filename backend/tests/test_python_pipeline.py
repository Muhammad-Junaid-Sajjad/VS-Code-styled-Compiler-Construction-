"""T027 — Python pipeline golden tests (FR-007…FR-012): functions, arithmetic,
control flow, prints — same schema as C."""
import os
import sys

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)

from python_analyzer import analyze_python  # noqa: E402


def test_functions_and_return():
    d = analyze_python("def add(a, b):\n    return a + b\nx = 1\ny = 2\nz = add(x, y)\n")
    assert d["success"] is True
    assert d["parse_tree"]["label"] == "Module"
    names = [s["name"] for s in d["symbol_table"]]
    assert "add" in names and "z" in names
    assert any("def add(a, b)" in l for l in d["ir_code"])
    assert any("return a + b" in l for l in d["ir_code"])


def test_arithmetic_and_comparison():
    d = analyze_python("a = 5\nb = 2\nc = a * b + 1\nif c > 5:\n    a = a + 1\n")
    assert d["success"] is True
    assert any("a * b + 1" in l for l in d["ir_code"])
    assert any("if c > 5:" in l for l in d["ir_code"])


def test_control_flow_while_for():
    d = analyze_python("i = 0\nwhile i < 3:\n    i = i + 1\nfor x in range(3):\n    x = x\n")
    assert d["success"] is True
    assert any("while i < 3:" in l for l in d["ir_code"])
    assert any("for x in range(3):" in l for l in d["ir_code"])


def test_print_and_tokens():
    d = analyze_python("print('hello')\n")
    assert d["success"] is True
    assert any("call print('hello')" in l for l in d["ir_code"])
    classes = {t["class"] for t in d["tokens"]}
    assert "STRING" in classes
    assert "BUILTIN" in classes or "IDENTIFIER" in classes
    for t in d["tokens"]:
        assert "token" in t and "class" in t and "line" in t and "col" in t


def test_symbol_value_semantics():
    d = analyze_python("x = 10\ny = x\ns = 'hi'\n")
    syms = {s["name"]: s for s in d["symbol_table"]}
    assert syms["x"]["value"] == "10"      # const initializer (FR-038)
    assert syms["y"]["value"] is None      # non-const
    assert syms["s"]["type"] == "str"
