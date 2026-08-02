---
id: 0009
title: Implement p0 unblock slice
stage: green
date_iso: 2026-08-02
surface: agent
model: oc/big-pickle
feature: 001-project-foundation
branch: 001-project-foundation
user: nauman_sajjad
command: /sp.implement (first slice — Setup + P0 unblock + backend contract/routing/taxonomy)
labels: ["implement", "p0", "unblock", "makefile", "contract"]
links:
  spec: specs/001-project-foundation/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - Makefile (new)
  - compiler/Makefile (new)
  - backend/requirements.txt (pinned)
  - backend/contract.py (new)
  - backend/app.py (rewritten: language routing, error taxonomy, request cap, per-language status)
  - backend/compiler_runner.py (rewritten: stdin feed, isolated cwd, resource caps, output cap)
  - backend/lexer_parser.py (fixed duplicate STRING regex group)
  - compiler/parser.y (NULL-tree segfault guard)
  - backend/tests/test_smoke.py (new)
  - backend/tests/test_tokenize.py (new)
tests:
  - make clean && make (SC-009 clean rebuild) — PASS
  - make test — 4 passed, 0 failures (smoke + tokenize)
  - Flask test client: valid C → 200+tokens+language; empty → 200+success:false; bad lang → 400; missing code → 400; /api/status per-language; /api/tokenize → 200
  - compiler < syntax_err.c → exit 0 (was 139 segfault) + "No parse tree" message
---

## Prompt

ultrathink /sp.implement

## Response snapshot

Executed the first /sp.implement slice (P0): Setup (T001 root Makefile, T002 compiler/Makefile with the verified no-`-ll` recipe, T003 pinned requirements flask==3.1.3/flask-cors==6.0.2/pytest==8.3.4, T005 test dirs + smoke fixture) and the P0 unblock set (T010a stdin feed in compiler_runner.py with isolated temp cwd + RLIMIT_AS/CPU caps + 1 MB output cap; T010b renamed the duplicate STRING regex group to CHAR mapped to STRING, killing the /api/compile 500; T010c NULL-tree guard in parser.y print_tree/print_inorder, killing the syntax-error SIGSEGV), then the backend contract slice (T008/T009 backend/contract.py schema + types; T011 language routing; T012 spec-accurate taxonomy 400/502/504/200+false with no 422; T013 1 MB request cap + per-language /api/status; T012a tokenize regression tests). Verified end-to-end: make clean && make rebuilds (SC-009); make test 4 passed; Flask test client returns 200 + non-empty tokens + language='c' for input1.c; empty→200+false; bad-language→400; missing-code→400; /api/status reports c/python readiness; /api/tokenize returns tokens. Fixed a Makefile path bug (space in repo path broke abspath + cd; switched to root-relative no-cd invocation). Marked 14/98 tasks [x]. Did not commit (awaiting user decision; branch 001-project-foundation).

## Outcome

- ✅ Impact: The previously broken `/api/compile` endpoint now returns HTTP 200 with a schema-valid payload for valid C — the P0 gate (non-empty smoke test) is met. Compiler no longer segfaults on syntax errors. Reproducible build + pinned deps in place.
- 🧪 Tests: 4 pytest tests passing; P0 gate checks all PASS via Flask test client.
- 📁 Files: 11 created/rewritten (see front-matter).
- 🔁 Next prompts: continue /sp.implement — next slice: frontend scaffold (T004/T003a/T006/T007) + remaining foundational (T014 logging, T015/T015a client, T015b concurrency) then US1 grammar/IR (T016-T021). Commit decision pending.
- 🧠 Reflection: The two verified blockers (500 regex crash, segfault) were each one-sentence fixes once the code was read carefully; the Makefile space-in-path bug was only caught by running `make test`, validating the "build truth over documentation" standard.

## Evaluation notes (flywheel)

- Failure modes observed: Makefile `abspath` broke on the space in "Compiler Project"; fixed by avoiding cd + abspath. venv path resolution in test target fixed.
- Graders run and results (PASS/FAIL): PASS (clean build, 4/4 tests, all P0-gate HTTP checks).
- Prompt variant: implement-p0-slice
- Next experiment: smallest change to try — scaffold frontend/ (T004) so `make setup` runs `npm ci`; then T016c precedence in parser.y.
