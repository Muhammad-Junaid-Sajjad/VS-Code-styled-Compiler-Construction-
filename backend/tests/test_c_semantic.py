"""T019 — C semantic errors assert the EXACT line and message (FR-005/FR-016)."""
import os
import sys

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)

from compiler_runner import run_compiler  # noqa: E402
from lexer_parser import parse_compiler_output  # noqa: E402


def semantic_errors(src: str) -> list:
    r = run_compiler(src)
    p = parse_compiler_output(r["stdout"], r["stderr"], r["success"])
    return p["errors"]


def test_duplicate_declaration_line_and_message():
    src = "#include <stdio.h>\nint main() {\n    int x = 1;\n    int x;\n    return 0;\n}\n"
    errs = semantic_errors(src)
    assert errs, "expected a duplicate-declaration error"
    assert errs[0]["line"] == 4, f"duplicate decl should be line 4, got {errs[0]['line']}"
    assert "Multiple declarations" in errs[0]["message"], errs[0]["message"]


def test_undeclared_variable():
    src = "#include <stdio.h>\nint main() {\n    y = 5;\n    return 0;\n}\n"
    errs = semantic_errors(src)
    assert errs, "expected an undeclared-variable error"
    assert errs[0]["line"] == 3, f"undeclared var should be line 3, got {errs[0]['line']}"
    assert "not declared" in errs[0]["message"], errs[0]["message"]
