"""T031 — US3: C and Python pipelines emit the SAME JSON schema (FR-006/FR-012).
Schema drift between languages is a P1 defect.
"""
import os
import sys

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)

from app import app  # noqa: E402

client = app.test_client()

EXPECTED_KEYS = {"success", "language", "tokens", "parse_tree", "symbol_table",
                 "ir_code", "errors", "warnings", "phases", "raw_output"}


def test_c_and_python_have_identical_top_level_schema():
    c = client.post("/api/compile", json={"code": "int main() { int x = 1; return 0; }", "language": "c"})
    py = client.post("/api/compile", json={"code": "x = 1\n", "language": "python"})
    assert c.status_code == 200 and py.status_code == 200
    ck, pk = set(c.get_json().keys()), set(py.get_json().keys())
    assert ck == EXPECTED_KEYS, f"C schema mismatch: {ck}"
    assert pk == EXPECTED_KEYS, f"Python schema mismatch: {pk}"
    assert c.get_json()["language"] == "c"
    assert py.get_json()["language"] == "python"


def test_phase_object_shape_identical():
    c = client.post("/api/compile", json={"code": "int main() { return 0; }", "language": "c"})
    py = client.post("/api/compile", json={"code": "x = 1\n", "language": "python"})
    assert set(c.get_json()["phases"]) == {"lexer", "parser", "semantic", "irgen"}
    assert set(py.get_json()["phases"]) == {"lexer", "parser", "semantic", "irgen"}
