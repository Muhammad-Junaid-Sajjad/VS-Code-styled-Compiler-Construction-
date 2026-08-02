---
id: 0002
title: Enhance persona for compiler project
stage: general
date_iso: 2026-08-02
surface: agent
model: oc/big-pickle
feature: none
branch: 001-project-foundation
user: nauman_sajjad
command: Enhance the CLAUDE.md review personas to be robust compiler-construction personas
labels: ["persona", "compiler-construction", "claude-md", "review-standards"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - CLAUDE.md
tests:
  - none (instruction-only change; no code tests run)
---

## Prompt

hi ,please go for seeign the clauude.md and see if the persona in it can be modified to more rovbst one for our compler constrcutoin project ,

## Response snapshot

Reviewed CLAUDE.md and identified three identity layers (SDD assistant, generic Ruthless Accuracy Expert, generic Elite Architect). Proposed and applied a deep compiler-domain rewrite: added a binding "Compiler Construction Domain Standards" block (spec §5.9 subset contract, no-miscompile invariant, determinism, diagnostics precision, per-phase checklists, cross-language output protocol, symbol-table integrity, subprocess security, pedagogical correctness, build-truth-over-docs), rewrote the Ruthless Accuracy Expert as compiler-anchored, enhanced the Elite Architect with compiler architecture + pipeline integration + compile-service hardening + frontend/build lenses, and added a new Compiler Internals Specialist persona (formal languages, LR parsing, y.output conflict audit, IR invariants). Delivery and depth choices confirmed via AskUserQuestion (Enhance CLAUDE.md / Deep compiler rewrite).

## Outcome

- ✅ Impact: CLAUDE.md now binds all review and construction work to the CompileViz accuracy contract — "100% accurate within the spec §5.9 subset", never silent miscompile, deterministic byte-identical output, exact line/col diagnostics.
- 🧪 Tests: none run (no code changed); verified section structure and 164-line addition via git diff.
- 📁 Files: CLAUDE.md (+164 lines)
- 🔁 Next prompts: /sp.implement for P0–P5 work governed by the new personas; optionally add .claude/agents subagents later.
- 🧠 Reflection: The generic personas could not enforce the project's real promise (bounded-subset accuracy); anchoring to spec §5.9 and adding phase-specific lenses makes the persona testable rather than aspirational.

## Evaluation notes (flywheel)

- Failure modes observed: user input had typos ("seeign", "rovbst", "compler constrcutoin") — intent was clear from context; no clarification needed.
- Graders run and results (PASS/FAIL): PASS (all CLAUDE.md placeholders resolved, no dangling references, section headers coherent).
- Prompt variant: persona-rewrite-compiler
- Next experiment: smallest change to try — invoke the Compiler Internals Specialist persona on the existing lexer.l / parser.y to validate the new standards.
