"""Real code execution engine (user request: VS Code-style compile/run terminal).

Actually compiles & runs submitted code with full security caps:
- C: `gcc -Wall -o main main.c` (compiler errors shown), then runs the binary.
- Python: `python3 main.py` (interpreted).
Enforces: 10 s timeout, output cap, address-space/CPU resource limits, isolated
temp cwd with cleanup, no shell interpolation (arg lists only), empty stdin so
interactive programs EOF immediately instead of hanging.
"""
import os
import resource
import shutil
import subprocess
import tempfile

TIMEOUT = 10
MAX_OUTPUT = 1_000_000
MAX_ADDRESS_SPACE = 512 * 1024 * 1024
MAX_CPU = 8


def _limit():
    try:
        resource.setrlimit(resource.RLIMIT_AS, (MAX_ADDRESS_SPACE, MAX_ADDRESS_SPACE))
        resource.setrlimit(resource.RLIMIT_CPU, (MAX_CPU, MAX_CPU + 1))
    except (ValueError, OSError):
        pass


def _cap(out: str) -> str:
    return (out or "")[:MAX_OUTPUT]


def run_code(code: str, language: str) -> dict:
    """Compile+run `code`; returns {success, command, output, exit_code, error}."""
    workdir = tempfile.mkdtemp(prefix="compileviz-run-", dir="/tmp")
    try:
        if language == "c":
            src = os.path.join(workdir, "main.c")
            exe = os.path.join(workdir, "main")
            with open(src, "w") as f:
                f.write(code)

            cmd = ["gcc", "-Wall", "-o", exe, src]
            comp = subprocess.run(cmd, capture_output=True, text=True, timeout=TIMEOUT,
                                  cwd=workdir, preexec_fn=_limit)
            compile_out = _cap(comp.stdout + comp.stderr)
            if comp.returncode != 0:
                return {"success": False, "command": "gcc -Wall -o main main.c",
                        "output": compile_out, "exit_code": comp.returncode, "error": "compilation failed"}

            run = subprocess.run([exe], capture_output=True, text=True, input="",
                                 timeout=TIMEOUT, cwd=workdir, preexec_fn=_limit)
            return {"success": run.returncode == 0, "command": "./main",
                    "output": _cap(run.stdout + run.stderr), "exit_code": run.returncode,
                    "error": ""}

        src = os.path.join(workdir, "main.py")
        with open(src, "w") as f:
            f.write(code)
        run = subprocess.run(["python3", src], capture_output=True, text=True, input="",
                             timeout=TIMEOUT, cwd=workdir, preexec_fn=_limit)
        return {"success": run.returncode == 0, "command": "python3 main.py",
                "output": _cap(run.stdout + run.stderr), "exit_code": run.returncode,
                "error": ""}
    except subprocess.TimeoutExpired:
        return {"success": False, "command": "", "output": "",
                "exit_code": -1, "error": f"Execution timed out after {TIMEOUT} seconds."}
    except Exception as e:  # pragma: no cover — defensive
        return {"success": False, "command": "", "output": "", "exit_code": -1, "error": str(e)}
    finally:
        shutil.rmtree(workdir, ignore_errors=True)
