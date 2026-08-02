import subprocess
import os
import tempfile
import shutil
import resource

# ─── Path to compiled binary ────────────────────────────────────────────────
BASE_DIR      = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COMPILER_DIR  = os.path.join(BASE_DIR, 'compiler')
COMPILER_BIN  = os.path.join(COMPILER_DIR, 'compiler')

# ─── Limits (T010 / plan §8.1 — untrusted code boundary) ────────────────────
TIMEOUT             = 10                 # seconds per compile (FR-019)
MAX_OUTPUT          = 1_000_000          # 1 MB stdout cap (bounded capture)
MAX_ADDRESS_SPACE   = 256 * 1024 * 1024  # 256 MB address-space cap (subprocess)
MAX_CPU             = 5                  # seconds of CPU time (subprocess)


def _find_binary():
    """
    Try common binary names produced by the compiler/Makefile.
    Returns the path of whichever exists, or None.
    """
    candidates = [
        os.path.join(COMPILER_DIR, 'compiler'),
        os.path.join(COMPILER_DIR, 'a.out'),
        os.path.join(COMPILER_DIR, 'main'),
        os.path.join(COMPILER_DIR, 'ccompiler'),
    ]
    for c in candidates:
        if os.path.isfile(c) and os.access(c, os.X_OK):
            return c
    return None


def _limit_resources():
    """Apply address-space + CPU caps to the child (Unix). No-op on failure."""
    try:
        resource.setrlimit(resource.RLIMIT_AS, (MAX_ADDRESS_SPACE, MAX_ADDRESS_SPACE))
        resource.setrlimit(resource.RLIMIT_CPU, (MAX_CPU, MAX_CPU + 1))
    except (ValueError, OSError):
        pass


def run_compiler(source_code: str) -> dict:
    """
    Feed source to the compiler via STDIN (T010a — the binary reads stdin,
    not argv: `./compiler < file`). Run in an isolated temp cwd with resource
    limits and a bounded stdout cap. Never a shell — user code is never
    interpolated into a command line.
    """
    binary = _find_binary()

    # ── Binary not found → clear error ───────────────────────────────────────
    if binary is None:
        return {
            'success'   : False,
            'stdout'    : '',
            'stderr'    : '',
            'returncode': -1,
            'binary'    : '',
            'truncated' : False,
            'error_msg' : (
                f"Compiler binary not found in '{COMPILER_DIR}'. "
                "Please run `make` inside the compiler/ folder first."
            )
        }

    workdir = tempfile.mkdtemp(prefix='compileviz-', dir='/tmp')
    try:
        result = subprocess.run(
            [binary],                       # source passed via stdin
            input=source_code,
            capture_output=True,
            text=True,
            timeout=TIMEOUT,
            cwd=workdir,                    # isolated cwd — never the compiler's real dir
            preexec_fn=_limit_resources,    # address-space + CPU caps
        )
        truncated = len(result.stdout) > MAX_OUTPUT
        return {
            'success'    : result.returncode == 0,
            'stdout'     : result.stdout[:MAX_OUTPUT],
            'stderr'     : result.stderr,
            'returncode' : result.returncode,
            'binary'     : binary,
            'truncated'  : truncated,
            'error_msg'  : ''
        }

    except subprocess.TimeoutExpired:
        return {
            'success'   : False,
            'stdout'    : '',
            'stderr'    : '',
            'returncode': -1,
            'binary'    : binary,
            'truncated' : False,
            'error_msg' : f"Compiler timed out after {TIMEOUT} seconds."
        }

    except Exception as e:
        return {
            'success'   : False,
            'stdout'    : '',
            'stderr'    : str(e),
            'returncode': -1,
            'binary'    : binary,
            'truncated' : False,
            'error_msg' : f"Unexpected error running compiler: {e}"
        }

    finally:
        shutil.rmtree(workdir, ignore_errors=True)   # temp hygiene (FR-020)


def check_compiler_status() -> dict:
    """Health-check: whether the binary exists and is executable (FR-018)."""
    binary = _find_binary()
    return {
        'binary_found'  : binary is not None,
        'binary_path'   : binary or '',
        'compiler_dir'  : COMPILER_DIR,
        'dir_exists'    : os.path.isdir(COMPILER_DIR),
    }
