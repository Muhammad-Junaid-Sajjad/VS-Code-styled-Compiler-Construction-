"""T017a — precedence/associativity golden tests (FR-002).
Each asserts the exact IR for a mixed-operator expression. A mis-associated
expression (e.g. a - b - c → a - (b - c)) is a silent miscompile.
"""
import os
import sys

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)

from compiler_runner import run_compiler  # noqa: E402
from lexer_parser import parse_compiler_output  # noqa: E402


def ir_for(body: str) -> list:
    src = f"#include <stdio.h>\nint main() {{ int a; int b; int c; {body} return 0; }}\n"
    r = run_compiler(src)
    p = parse_compiler_output(r["stdout"], r["stderr"], r["success"])
    return [l for l in p["ir_code"] if l.strip()]


def test_subtraction_is_left_associative():
    # a - b - c  ==  (a - b) - c  — NOT a - (b - c)
    ir = ir_for("a = a - b - c; ")
    assert ir[0] == "t0 = a - b", f"expected (a-b) first, got {ir[0]}"
    assert ir[1] == "t1 = t0 - c", f"expected (t0-c) second, got {ir[1]}"


def test_multiplication_binds_tighter_than_addition():
    # a + b * c  ==  a + (b * c)
    ir = ir_for("a = a + b * c; ")
    assert ir[0] == "t0 = b * c", f"expected (b*c) first, got {ir[0]}"
    assert ir[1] == "t1 = a + t0", f"expected (a+t0) second, got {ir[1]}"


def test_division_binds_tighter_than_subtraction():
    # a - b / c  ==  a - (b / c)
    ir = ir_for("a = a - b / c; ")
    assert ir[0] == "t0 = b / c"
    assert ir[1] == "t1 = a - t0"


def test_relational_looser_than_arithmetic():
    # (a + b) > c is the only sensible parse
    src = "#include <stdio.h>\nint main() { int a; int b; int c; int d; d = a + b; if (d > c) { a = 1; } return 0; }\n"
    r = run_compiler(src)
    p = parse_compiler_output(r["stdout"], r["stderr"], r["success"])
    assert any("if (d > c)" in l for l in p["ir_code"])
