"""T060c / FR-059 — the sample catalog is the acceptance contract: every sample
must compile through all 4 phases within the §5.9 subset. A shipped sample the
pipeline cannot fully process is a P1 defect.
"""
import os
import sys

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)

from compiler_runner import run_compiler  # noqa: E402
from lexer_parser import parse_compiler_output  # noqa: E402
from python_analyzer import analyze_python  # noqa: E402

REPO = os.path.dirname(BACKEND_DIR)
C_DIR = os.path.join(REPO, "compiler")

# Catalog C samples not present as files (they live in frontend/src/samples/catalog.ts).
HELLO_C = "#include <stdio.h>\n\nint main() {\n    int x = 10;\n    printf(\"Hello CompileViz!\\n\");\n    return 0;\n}"
ARITHMETIC_C = "#include <stdio.h>\n\nint main() {\n    int a = 3;\n    int b = 2;\n    float c = 2.5;\n    a = a + b;\n    c = a + c;\n    printf(\"Arithmetic done\\n\");\n    return 0;\n}"
FACTORIAL_C = "#include <stdio.h>\n\nint main() {\n    int n = 5;\n    int f = 1;\n    for (n = 5; n > 1; n = n - 1) {\n        f = f * n;\n    }\n    printf(\"Factorial computed\\n\");\n    return 0;\n}"
HELLO_PY = "x = 10\ny = 20\ntotal = x + y\nprint(total)"
FUNCTIONS_PY = "def add(a, b):\n    return a + b\n\nx = 5\ny = 3\nresult = add(x, y)\nprint(result)"

# A P1 defect if any of these fails.
C_VALID_SAMPLES = [
    ("hello.c", HELLO_C),
    ("arithmetic.c", ARITHMETIC_C),
    ("factorial.c", FACTORIAL_C),
    ("input1.c", open(os.path.join(C_DIR, "input1.c")).read()),
    ("input2.c", open(os.path.join(C_DIR, "input2.c")).read()),
    ("test.c", open(os.path.join(C_DIR, "test.c")).read()),
]
# input3.c intentionally carries a duplicate-declaration error (must surface it).
C_ERROR_SAMPLE = ("input3.c", open(os.path.join(C_DIR, "input3.c")).read())

PY_SAMPLES = [
    ("hello.py", HELLO_PY),
    ("functions.py", FUNCTIONS_PY),
]


def test_c_catalog_samples_compile():
    for name, src in C_VALID_SAMPLES:
        r = run_compiler(src)
        assert r["error_msg"] == "", f"[{name}] runner error: {r['error_msg']}"
        p = parse_compiler_output(r["stdout"], r["stderr"], r["success"])
        assert not p["errors"], f"[{name}] unexpected errors: {p['errors']}"
        assert p["ir_code"], f"[{name}] empty IR"


def test_c_error_sample_surfaces_diagnostic():
    name, src = C_ERROR_SAMPLE
    r = run_compiler(src)
    p = parse_compiler_output(r["stdout"], r["stderr"], r["success"])
    assert p["errors"], f"[{name}] expected the duplicate-declaration diagnostic"
    assert any("Multiple declarations" in e["message"] for e in p["errors"])


def test_python_catalog_samples_analyze():
    for name, src in PY_SAMPLES:
        d = analyze_python(src)
        assert d["success"] is True, f"[{name}] failed: {d['errors']}"
        assert d["parse_tree"] is not None, f"[{name}] no parse tree"
        assert d["symbol_table"], f"[{name}] empty symbol table"
