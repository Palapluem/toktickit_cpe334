# AI Use and Reflection — Lab 4

**Status:** Started 3 October 2026 and updated as the work happens. "My Reflection" is written or confirmed by the student, never generated as if it were theirs.

## Which agents and models I used

| Tool | Model (as verifiable) | Used for |
|---|---|---|
| Claude Code (Anthropic) | `claude-opus-5-5` (session setting, 3 October 2026) | Specification agent: read-only orientation, decision rounds, drafting the four contracts. Planned coding agent for Lab 4 implementation |
| Codex (OpenAI) | GPT-5 (deployment suffix not exposed in this session) | Google Docs report editing and Lab 4 execution, including Issue #93 dashboards |

Each later entry records the tool and model actually used for that step. An unknown model label is written as unknown.

## Selected Key Prompts (6–10 of many)

| # | Prompt used | What the agent did and the outcome | My Reflection |
|---|---|---|---|
| 1 | `Read _private/lab-04/MASTER-PROMPT.md and _private/lab-04/prompts/00-orientation.md in full. Perform only the read-only orientation, report findings, and stop before implementation or GitHub changes.` (verbatim, 3 Oct 2026) | Read the labsheet, workflow guide, inherited contracts and both repositories without changing anything. Found that live `main` was `af59d34`, that every E2E run rewrote 48 committed Lab 3 screenshots, and where the SDS conflicts with Lab 3/4. Passed the baseline gate and asked the first decision cluster | [student to write] |
| 2 | "ตามที่แนะนำ" — English rendering: "As recommended" — the answer to four decision rounds, plus "can it be done in 3–4 days including waiting for my peer's review?" (3 Oct 2026) | Proposed sourced options with trade-offs for the Action lifecycle, resolution gate, fields and visibility, history, concurrency and dashboard metrics; the student approved each. Measured the Lab 3 review latency to plan a realistic schedule | [student to write] |
| 3 | `_private/lab-04/prompts/11-codex-dashboards.md`, version 2 (5 Oct 2026); the student clarified not to use VoiceOver or a screen reader for this task | Implemented Issue #93 in an isolated worktree using test-first commits. At this checkpoint, server and client suites passed, six dashboard E2E tests passed, and full E2E was 45/46 because the existing Lab 3 forced-password landing assertion still expected Ticket Queue. No VoiceOver or screen reader was started. | [student to write] |
| 4 | Claude Code follow-up on 5 Oct 2026 (paraphrased): update the three affected Lab 3 landing assertions, remove the `dashboardLanding` detour, rerun the suites, record results, then open only PR #93; the student approved this scope. | Committed the three assertion updates red-first (`b68f90c`): two client tests failed because the current flow still navigated to `/tickets`. Removed the detour in `c59a70a`; updated the REG-03 record in `c72aabd`. Server 568/568, client 227/227, full E2E 46/46; both builds pass and lint exits 0 with three existing warnings. | [student to write] |
| 5–10 | PENDING — later implementation, review-response and report prompts, recorded when actually used | | |

## Provenance note

AI use is disclosed here and in the private handoff. Repository commits and pull requests follow the student's no-AI-credit rule in `_private/lab-04/COORDINATION.md` §7. Decisions are recorded in the private decision register with the student's exact answers.

## My Reflection

PENDING — the student's own reflection on specification-agent and coding-agent use.
