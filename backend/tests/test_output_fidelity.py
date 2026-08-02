"""T030/T030a — US3: parsed output matches the raw compiler sections; the
parse_tree is the REAL derivation tree, never the synthetic grouping (FR-037).
"""
import os
import sys

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)

from compiler_runner import run_compiler  # noqa: E402
from lexer_parser import parse_compiler_output  # noqa: E402
from tree_builder import build_tree  # noqa: E402
from app import _extract_tree_section  # noqa: E402

REPO = os.path.dirname(BACKEND_DIR)
INPUT1 = os.path.join(REPO, "compiler", "input1.c")


def test_ir_matches_raw_section():
    r = run_compiler(open(INPUT1).read())
    p = parse_compiler_output(r["stdout"], r["stderr"], r["success"])
    # IR lines must appear verbatim in the PHASE-4 section of raw output.
    raw_ir = r["stdout"].split("PHASE 4: INTERMEDIATE CODE GENERATION")[-1]
    for line in p["ir_code"]:
        if line.strip():
            assert line.strip() in raw_ir, f"IR line not in raw output: {line!r}"


def test_parse_tree_is_real_derivation_tree():
    r = run_compiler(open(INPUT1).read())
    section = _extract_tree_section(r["stdout"])
    tree = build_tree(section, [])
    assert tree["label"] == "program", f"expected 'program' root, got {tree['label']}"
    # Real tree has semantic annotations like 'main', 'declaration', 'if-else'.
    labels = []
    def walk(n):
        labels.append(n["label"])
        for c in n["children"]:
            walk(c)
    walk(tree)
    assert any("declaration" in l for l in labels), "derivation-tree annotations missing"


def test_error_bullets_match_raw_section():
    r = run_compiler(open(os.path.join(REPO, "compiler", "input3.c")).read())
    p = parse_compiler_output(r["stdout"], r["stderr"], r["success"])
    assert p["errors"], "expected semantic errors from input3.c"
    assert any("Multiple declarations" in e["message"] for e in p["errors"])
