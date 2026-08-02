---
id: 0004
title: Apply plan updates u-p1-u-p9
stage: plan
date_iso: 2026-08-02
surface: agent
model: oc/big-pickle
feature: 001-project-foundation
branch: 001-project-foundation
user: nauman_sajjad
command: /sp.plan evaluate the plans.md from the expert persona ... then update it
labels: ["plan", "update", "grammar-completeness", "ir-correctness", "p0-unblock"]
links:
  spec: specs/001-project-foundation/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/001-project-foundation/plan.md
tests:
  - none (plan-only edits; verified all 10 edit blocks landed, no placeholders)
---

## Prompt

ultrathink /sp.plan evaluate the plans.md from the expert persona for me okay , thne report me back if it needs some updatioon or modifications fo rthi sproject of mine
→ then: ultrathink okay please go for updation of this plans.md fiel okay then reprt me back as well

## Response snapshot

Evaluated specs/001-project-foundation/plan.md through the three personas and applied the full update set U-P1…U-P9. Plan was structurally excellent (build-ground-truth, unified schema, security/deployment) but P1 was mis-scoped vs the updated spec and code reality. Applied edits: (1) header revision note; (2) §7 P0 unblock tasks — fix duplicate-STRING `_fallback_tokenise` HTTP-500 crash, guard NULL-tree segfault, feed stdin (GAP-D); P0 exit gate now requires a non-empty compile smoke test (empty-but-green rejected); (3) §7 P1 rewritten to add grammar-completeness vs §5.9 (precedence `%left/%right/%prec`, optional headers, `%`/logical/`while`/`do-while`/`break`/`continue`, `double`→diagnostic, pinned printf/scanf calls), IR-correctness workstream (stale-buff double-emit, `a = NULL`, undefined temps, conversion instructions), line/col accuracy (countn block-comment fix + column tracking), and real-header alignment (PHASE 1-4, not `=== ===`) with the token-source decision; (4) §4.4 catalog — factorial.c now iterative, §5.9/FR-059 compliance note added; (5) §5 Symbol reordered to match spec + value semantics (FR-038), parse_tree described as the real derivation tree (FR-037); (6) §8 risks — added supported-subset associativity miscompile + grammar-extension scope-creep risks; (7) §9 — FR-059/SC-010 mapped. Verified all blocks landed.

## Outcome

- ✅ Impact: plan.md now schedules the work the updated spec and the verified code state actually require — P1 is scoped to grammar completeness, IR correctness, and line/col accuracy, and P0 unblocks the broken compile endpoint.
- 🧪 Tests: none (plan-only); verified edit blocks + no placeholders.
- 📁 Files: specs/001-project-foundation/plan.md
- 🔁 Next prompts: /sp.tasks (tasks.md T001-T060b still has the stale "empty-but-green" P0 checkpoint and no grammar/IR/line-col tasks — needs regeneration); then /sp.implement.
- 🧠 Reflection: The plan's P1 as-written would not have delivered the updated §5.9 or a working product; grounding the plan in verified compiler behavior (PHASE headers, IR bugs, line drift) converted vague "subset enforcement" into concrete workstreams.

## Evaluation notes (flywheel)

- Failure modes observed: plan-vs-tasks contradiction (plan wants a real P0 smoke test; tasks.md says empty-but-green) — flagged, tasks.md still needs updating.
- Graders run and results (PASS/FAIL): PASS (all 10 edit blocks verified; spec/plan now coherent).
- Prompt variant: plan-update-u-p1-u-p9
- Next experiment: smallest change to try — regenerate tasks.md (T001-T060b) to include the new P0 unblock tasks and P1 grammar/IR/line-col workstreams.
