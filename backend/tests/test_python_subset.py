"""T028 — Python §5.9 subset boundary: unsupported constructs must surface a
clear diagnostic or documented static-warning, never a silent miscompile."""
import os
import sys

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)

from python_analyzer import analyze_python  # noqa: E402


def test_syntax_error_reported_with_line_col():
    d = analyze_python("def f(:\n")
    assert d["success"] is False
    assert d["errors"], "expected a syntax error"
    assert d["errors"][0]["line"] == 1


def test_unclosed_string_reported():
    d = analyze_python("x = 'abc\n")
    assert d["success"] is False
    assert d["errors"]


def test_out_of_scope_name_is_warning():
    # `undefined` is never assigned/defined → static warning (not a silent pass).
    d = analyze_python("x = undefined + 1\n")
    assert d["success"] is True
    assert any("undefined" in w["message"] for w in d["warnings"])


def test_supported_subset_constructs_ok():
    d = analyze_python("import math\nx = 1\nif x > 0:\n    x = x - 1\nwhile x < 5:\n    x = x + 1\nprint(x)\n")
    assert d["success"] is True
