"""T017 — golden tests for every supported C §5.9 construct (4 phases, non-empty)."""
import os
import sys

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)

from compiler_runner import run_compiler  # noqa: E402
from lexer_parser import parse_compiler_output  # noqa: E402


def compile_ok(src: str) -> dict:
    r = run_compiler(src)
    assert r["error_msg"] == "", r["error_msg"]
    assert "PHASE 1: LEXICAL ANALYSIS" in r["stdout"]
    assert "PHASE 4: INTERMEDIATE CODE GENERATION" in r["stdout"]
    p = parse_compiler_output(r["stdout"], r["stderr"], r["success"])
    assert p["symbol_table"], "symbol table empty"
    assert p["ir_code"], "IR empty"
    return p


def test_declarations_and_multiple_vars():
    compile_ok("#include <stdio.h>\nint main() { int a; char b; float c; a = 1; b = 'x'; c = 2.5; return 0; }\n")


def test_arithmetic_including_modulo():
    p = compile_ok("#include <stdio.h>\nint main() { int r; r = 7 % 3; r = r + 2 * 4; return 0; }\n")
    assert any("7 % 3" in line for line in p["ir_code"]), "modulo IR missing"


def test_relational_and_logical_simple():
    compile_ok("#include <stdio.h>\nint main() { int a; a = 1; if (a > 0) { a = 2; } return 0; }\n")


def test_if_else():
    p = compile_ok("#include <stdio.h>\nint main() { int a; a = 1; if (a > 0) { a = 2; } else { a = 3; } return 0; }\n")
    assert any("if (" in line for line in p["ir_code"])


def test_for_loop():
    p = compile_ok("#include <stdio.h>\nint main() { int i; for (i = 0; i < 5; i++) { i = i; } return 0; }\n")
    assert any("JUMP" in line for line in p["ir_code"]), "for-loop jump missing"


def test_while_loop():
    p = compile_ok("#include <stdio.h>\nint main() { int i; i = 0; while (i < 5) { i = i + 1; } return 0; }\n")
    assert any("GOTO" in line for line in p["ir_code"]), "while-loop GOTO missing"


def test_do_while_loop():
    p = compile_ok("#include <stdio.h>\nint main() { int i; i = 0; do { i = i + 1; } while (i < 3); return 0; }\n")
    assert any("GOTO L" in line for line in p["ir_code"])


def test_printf_scanf():
    # printf/scanf emit tree nodes but no three-address IR by design (FR-001 US1#3).
    src = '#include <stdio.h>\nint main() { int x; printf("Hello"); scanf("%d", &x); return 0; }\n'
    r = run_compiler(src)
    assert r["error_msg"] == ""
    p = parse_compiler_output(r["stdout"], r["stderr"], r["success"])
    assert p["symbol_table"], "symbol table empty"
    kinds = {s["type"] for s in p["symbol_table"]}
    assert "N/A" in kinds, "printf/scanf keywords missing from symbol table"


def test_headerless_program():
    # T016d: no #include is valid
    compile_ok("int main() { int x = 10; return 0; }\n")


def test_comment_line_numbers():
    src = "#include <stdio.h>\nint main() {\n  /* multi\n     line\n     comment */\n  int x = 5;\n  return 0;\n}\n"
    r = run_compiler(src)
    p = parse_compiler_output(r["stdout"], r["stderr"], r["success"])
    x = [s for s in p["symbol_table"] if s["name"] == "x"]
    assert x and x[0]["line"] == 5, f"x should be line 5, got {x}"
