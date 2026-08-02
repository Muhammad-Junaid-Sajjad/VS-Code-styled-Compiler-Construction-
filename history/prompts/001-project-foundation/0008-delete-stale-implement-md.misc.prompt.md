---
id: 0008
title: Delete stale implement.md
stage: misc
date_iso: 2026-08-02
surface: agent
model: oc/big-pickle
feature: 001-project-foundation
branch: 001-project-foundation
user: nauman_sajjad
command: okay remove the implement.md file from my system completely
labels: ["implement.md", "delete", "cleanup", "artifacts"]
links:
  spec: specs/001-project-foundation/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/001-project-foundation/implement.md (DELETED)
  - specs/001-project-foundation/plan.md (2 GAP-ref cleanups)
  - specs/001-project-foundation/tasks.md (3 GAP-ref cleanups)
tests:
  - none (file deletion + reference cleanup; verified implement.md absent, 0 GAP refs in specs/)
---

## Prompt

okay remove the implement .md file from my system cvompletely okay

## Response snapshot

Deleted specs/001-project-foundation/implement.md permanently (it was untracked, so no git recovery — confirmed with the user before acting). implement.md was a stale "Concrete How" reference (old task IDs T001-T060b, old === === markers assumption, broken gcc -ll recipe) superseded by the regenerated self-contained tasks.md; it was not a prerequisite for /sp.implement (which reads tasks.md). Before deleting, found 5 dangling GAP-A..D references (2 in plan.md, 3 in tasks.md) and replaced them with self-explanatory phrasing (e.g., "Fix GAP-D: feed source via stdin" → "Fix the stdin-vs-argv contract: feed source via stdin"; "(GAP-B)" → removed; "(GAP-C / FR-038)" → "(FR-038)"). Verified: implement.md absent; 0 GAP refs remaining in specs/ artifacts. Historical PHRs (0004, 0005) still mention GAP codes — kept as audit records.

## Outcome

- ✅ Impact: Removed a stale, misleading reference doc; the living artifacts (spec/plan/tasks) are now self-contained with no dangling GAP references. tasks.md remains the single executable source for implementation.
- 🧪 Tests: none (file deletion); verified implement.md gone and 0 GAP refs in specs/.
- 📁 Files: specs/001-project-foundation/implement.md deleted; plan.md + tasks.md reference cleanup (5 edits).
- 🔁 Next prompts: /sp.implement (or direct execution) of tasks.md T001–T010c — Setup + P0 unblock.
- 🧠 Reflection: The user's instinct was correct — implement.md was redundant post-regeneration; the honest caveat (permanent deletion of an untracked file) was surfaced before acting, then honored.

## Evaluation notes (flywheel)

- Failure modes observed: none; the deletion plus GAP-reference cleanup was atomic and verified.
- Graders run and results (PASS/FAIL): PASS (implement.md absent; 0 GAP refs in specs/; PHRs intentionally retained as records).
- Prompt variant: delete-stale-artifact
- Next experiment: smallest change to try — begin tasks.md execution (T001–T010c) and confirm /api/compile returns HTTP 200 on input1.c.
