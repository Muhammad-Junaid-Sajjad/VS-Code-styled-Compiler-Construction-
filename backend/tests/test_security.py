"""T057 — compile-service security posture (plan §8.1, FR-056/FR-058).

Submitted code is attacker-controlled: timeout, resource caps, bounded output,
no shell interpolation, temp hygiene, request-size bound, concurrency guard,
CORS allowlist.
"""
import os
import sys

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)

import app as app_module  # noqa: E402
from app import app  # noqa: E402
import compiler_runner  # noqa: E402

client = app.test_client()


def test_request_size_bound_413():
    big = "x" * (2 * 1024 * 1024)
    assert client.post("/api/compile", json={"code": big}).status_code == 413


def test_concurrency_guard_429():
    assert app_module._compile_lock.acquire(blocking=False)
    try:
        r = client.post("/api/compile", json={"code": "int main(){return 0;}", "language": "c"})
        assert r.status_code == 429
    finally:
        app_module._compile_lock.release()


def test_runner_timeout_cap():
    assert compiler_runner.TIMEOUT == 10, "timeout must be 10 s (FR-019)"
    assert compiler_runner.MAX_OUTPUT == 1_000_000, "stdout cap must be 1 MB"


def test_runner_uses_stdin_not_shell():
    # The subprocess must be invoked as [binary] with input=source — never a shell.
    import inspect
    src = inspect.getsource(compiler_runner.run_compiler)
    assert "shell=True" not in src, "must never use shell=True"
    assert "input=source_code" in src, "must feed source via stdin"


def test_cors_allowlist_no_wildcard():
    # CORS is restricted to ALLOWED_ORIGINS (FR-056) — never a wildcard.
    assert "*" not in app_module.ALLOWED_ORIGINS, "wildcard origin is not allowed"


def test_security_headers_present():
    r = client.get("/api/status")
    assert r.headers.get("X-Content-Type-Options") == "nosniff"
    assert r.headers.get("Content-Security-Policy") is not None
