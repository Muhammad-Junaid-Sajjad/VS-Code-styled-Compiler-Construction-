"""P0 non-empty compile smoke test (plan §7 P0 gate; FR-048/FR-049).

MUST NOT be "empty-but-green": it compiles a real C sample through the
compiler binary and asserts the pipeline actually produced output.
Requires the `compiler/compiler` binary built via `make compiler`.
"""
import os
import sys

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)

from compiler_runner import run_compiler  # noqa: E402

REPO = os.path.dirname(BACKEND_DIR)
INPUT1 = os.path.join(REPO, "compiler", "input1.c")


def test_input1_compiles_non_empty():
    src = open(INPUT1).read()
    r = run_compiler(src)
    assert r["error_msg"] == "", f"runner error: {r['error_msg']}"
    assert "PHASE 1: LEXICAL ANALYSIS" in r["stdout"], "missing PHASE 1 header"
    assert "PHASE 4: INTERMEDIATE CODE GENERATION" in r["stdout"], "missing PHASE 4 header"
    assert r["stdout"].strip(), "stdout is empty — pipeline produced nothing"
