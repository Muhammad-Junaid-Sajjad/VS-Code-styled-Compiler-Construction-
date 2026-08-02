"""T020 — §5.9 subset boundary: every unsupported construct yields a clear
diagnostic (never a silent miscompile); newly added constructs parse cleanly.
"""
import os
import sys

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)

from compiler_runner import run_compiler  # noqa: E402
from lexer_parser import parse_compiler_output  # noqa: E402


def compile_diags(src: str) -> tuple:
    r = run_compiler(src)
    p = parse_compiler_output(r["stdout"], r["stderr"], r["success"])
    return p["errors"], r


# Unsupported constructs → a clear diagnostic, never a silent miscompile.
UNSUPPORTED = {
    "struct": "#include <stdio.h>\nstruct Foo { int a; };\nint main() { return 0; }\n",
    "switch": "#include <stdio.h>\nint main() { int x; switch (x) { } return 0; }\n",
    "array": "#include <stdio.h>\nint main() { int a[5]; return 0; }\n",
    "pointer": "#include <stdio.h>\nint main() { int *p; return 0; }\n",
    "enum": "#include <stdio.h>\nenum Color { R };\nint main() { return 0; }\n",
    "double": "#include <stdio.h>\nint main() { double x; return 0; }\n",
    "user_function": "#include <stdio.h>\nint add(int a) { return a; }\nint main() { return 0; }\n",
}


def test_unsupported_constructs_produce_diagnostics():
    for name, src in UNSUPPORTED.items():
        errors, r = compile_diags(src)
        assert errors, f"[{name}] expected a clear diagnostic, got none"
        # never a silent miscompile: either the message names the feature or it's a syntax error
        joined = " ".join(e["message"] for e in errors).lower()
        assert ("unsupported" in joined or "syntax error" in joined or "not declared" in joined
                or name in joined), f"[{name}] unclear diagnostic: {errors}"


def test_new_constructs_compile_cleanly():
    clean = [
        ("while", "#include <stdio.h>\nint main() { int i; while (i < 3) { i = i + 1; } return 0; }\n"),
        ("do-while", "#include <stdio.h>\nint main() { int i; do { i = i + 1; } while (i < 3); return 0; }\n"),
        ("modulo", "#include <stdio.h>\nint main() { int r; r = 10 % 3; return 0; }\n"),
        ("headerless", "int main() { int x = 1; return 0; }\n"),
    ]
    for name, src in clean:
        errors, r = compile_diags(src)
        assert not errors, f"[{name}] should compile cleanly, got {errors}"
