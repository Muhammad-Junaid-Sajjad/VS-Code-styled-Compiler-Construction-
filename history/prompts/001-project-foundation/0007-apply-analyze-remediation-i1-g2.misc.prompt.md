---
id: 0007
title: Apply analyze remediation I1-G2
stage: misc
date_iso: 2026-08-02
surface: agent
model: oc/big-pickle
feature: 001-project-foundation
branch: 001-project-foundation
user: nauman_sajjad
command: /sp.analyze ... then "ultrathink ok proceed please" — apply the approved remediation
labels: ["analyze", "remediation", "plan-fix", "tasks-fix", "coherence"]
links:
  spec: specs/001-project-foundation/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/001-project-foundation/plan.md (I1-I5 fixes)
  - specs/001-project-foundation/tasks.md (G1-G2 additions)
tests:
  - none (artifact edits; verified grep: 0 gcc -ll, 0 422, 0 stale counts/refs; 98 tasks unique, no dupes)
---

## Prompt

ultrathink ok proceed please (applying the approved /sp.analyze remediation for I1, I2, I3, G1, G2)

## Response snapshot

Applied the /sp.analyze remediation edits (user approved). plan.md: (I1) corrected the build recipe at §2 ground-truth table, §4.2, and §7 P0 — `gcc -ll -w -o compiler y.tab.c` → `gcc -w -o compiler y.tab.c` with an explicit "omit -ll" note (verified -ll links libl's own main and fails); (I2) removed the HTTP 422 row from §6.4 (spec FR-021 defines no 422); (I3) reworded "The C core stays untouched in compiler/" → "extended per §5.9 (grammar completeness, IR and lexer fixes), never replaced"; (I4) updated stale counts to FR-001…FR-059 / SC-001…SC-010 and "~58 FRs" → "59 FRs"; (I5) fixed "FR-027/FR-4" → "FR-041" cross-ref. tasks.md: (G1) added five US2 panel-renderer tasks T038a (Tokens.tsx FR-036), T038b (IR.tsx FR-039), T038c (Diagnostics.tsx FR-040), T038d (ParseTree.tsx FR-037), T038e (PhaseFlow.tsx FR-035) + updated Phase-6 checkpoint and parallel/dependency notes; (G2) added T012a — /api/tokenize FR-017 endpoint test at backend/tests/test_tokenize.py; refreshed T012's stale 422 parenthetical. Result: 92 → 98 tasks, all unique; coverage now 59/59 FRs fully explicit; 0 HIGH findings remain.

## Outcome

- ✅ Impact: All three artifacts are now mutually coherent with zero HIGH findings — the plan's build recipe matches the verified working command, the error taxonomy is spec-accurate (no 422), and every frontend panel + the tokenize endpoint has an explicit executable task.
- 🧪 Tests: none (artifact edits); verified by grep (0 stale terms; 98 unique task IDs, no duplicates).
- 📁 Files: specs/001-project-foundation/plan.md, specs/001-project-foundation/tasks.md
- 🔁 Next prompts: /sp.implement starting with T001–T010c (Setup + P0 unblock); optionally /sp.constitution to fill the template (K1, still open).
- 🧠 Reflection: The read-only analysis produced surgical, verifiable fixes; re-running the checks after edits confirmed 0 HIGH — deterministic and reproducible remediation.

## Evaluation notes (flywheel)

- Failure modes observed: none on apply; all 12 edits (7 plan + 5 tasks) landed; verification greps all clean.
- Graders run and results (PASS/FAIL): PASS (I1-I5 and G1-G2 closed; 98 unique tasks; coverage 59/59).
- Prompt variant: analyze-remediation
- Next experiment: smallest change to try — execute T001–T010c (Setup + P0 unblock) and confirm /api/compile returns HTTP 200 on input1.c.
