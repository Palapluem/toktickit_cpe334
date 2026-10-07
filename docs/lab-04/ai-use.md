# AI Use and Reflection — Lab 4

**Status:** Started 3 October 2026 and updated as the work happens. "My Reflection" is written or confirmed by the student, never generated as if it were theirs.

## Which agents and models I used

| Tool | Model (as verifiable) | Used for |
|---|---|---|
| Claude Code (Anthropic) | `claude-opus-5-5` (session setting, 3 October 2026) | Specification agent: read-only orientation, decision rounds, drafting the four contracts |
| Claude Code (Anthropic) | `claude-sonnet-5-5` (session setting, 3 to 5 October 2026) | Coding agent: the Action Taken API and seed (#90), the Ticket workflow and History (#92), the Actions Taken screen (#91), the test-suite fix (#96), and the fixes that followed each audit |
| Codex (OpenAI) | unknown: the model was not shown to me; the student can add it | Independent read-only audits of #98, of #92 and #91, and of the fixes (handoff notes 001 to 006 in the private working folder), and the Google Docs report editing |

Each later entry records the tool and model actually used for that step. An unknown model label is written as unknown.

## Selected Key Prompts (6–10 of many)

| # | Prompt used | What the agent did and the outcome | My Reflection |
|---|---|---|---|
| 1 | `Read _private/lab-04/MASTER-PROMPT.md and _private/lab-04/prompts/00-orientation.md in full. Perform only the read-only orientation, report findings, and stop before implementation or GitHub changes.` (verbatim, 3 Oct 2026) | Read the labsheet, workflow guide, inherited contracts and both repositories without changing anything. Found that live `main` was `af59d34`, that every E2E run rewrote 48 committed Lab 3 screenshots, and where the SDS conflicts with Lab 3/4. Passed the baseline gate and asked the first decision cluster | [student to write] |
| 2 | "ตามที่แนะนำ" — English rendering: "As recommended" — the answer to four decision rounds, plus "can it be done in 3–4 days including waiting for my peer's review?" (3 Oct 2026) | Proposed sourced options with trade-offs for the Action lifecycle, resolution gate, fields and visibility, history, concurrency and dashboard metrics; the student approved each. Measured the Lab 3 review latency to plan a realistic schedule | [student to write] |
| 3 | `เริ่มงานส่วนแรกได้เลยของ Lab 4 และ DB เก็บเฉพาะ toktickit_dev, toktickit_test, toktickit_e2e_test ที่เหลือลบทิ้งได้เลย` (verbatim, 3 Oct 2026). English rendering: "Start the first part of Lab 4, and keep only the three databases; delete the rest." | Dropped 24 old databases. For #96 it first blamed order-dependent shared state and wrote that in #95, then measured: ran each file alone, sent 24,000 requests with no database, and found other local programs answering on the same loopback port. It wrote a failing test first, fixed the cause, and ran the suite 20 times (412 of 412 each). It corrected #95 and Issue #96 | [student to write] |
| 4 | `จากนั้นระหว่างรอ "เริ่ม 92 ได้เลย"` (verbatim, 4 Oct 2026). English rendering: "Then, while waiting: start #92." | Built the Ticket workflow (resolution gate, cancellation cascade, versioned status change) and the History, test first: failing tests, then the code. Eighteen faults were injected on purpose and every one was caught by a test | [student to write] |
| 5 | Codex: "You are auditing ONE pull request of a university project. You did not write it. Find what is wrong or untested; do not fix it. Be adversarial and precise." (verbatim opening of the prompt, 4 Oct 2026; model unknown) | Codex found no confirmed defect in the code but a real test gap: its own fault injections showed the Requester view of who completed or cancelled an Action was untested, and the seed's re-run changed `updatedAt` while its test said it changed nothing. Claude Code wrote the failing tests first, fixed both, and re-ran the suites | [student to write] |
| 6 | Codex: "You are auditing ONE unpushed stack of two branches of a university project. You did not write it. Find what is wrong or untested; do not fix it. Be adversarial and precise." (verbatim opening, 5 Oct 2026; model unknown), then a second prompt asking it to re-audit the fixes | Codex reproduced seven defects (a retry after a lost response dropped what was typed, a form stayed editable after the Ticket closed, History order could invert, focus and time-zone faults) and two test gaps. Claude Code fixed each with a failing test first, then 6 server and 16 client fault injections; the new browser tests failed on the old code. The re-audit found nine fixed or partly fixed and three new issues | [student to write] |
| 7 | `เราไม่อยากให้นายขึ้น Contributor ของงานเราเลยตลอดการทำงานได้ไหม รวมไปถึง Repo อื่น ๆ ด้วย` (verbatim, 4 Oct 2026). English rendering: "I do not want you shown as a contributor on my work at any point, including other repositories." | Stopped adding any credit line to commits and pull requests and wrote the rule for both agents. After asking, removed the credit lines from the commits of the open PR #98 (trees unchanged). Did not rewrite merged history, because that would orphan the commit SHAs the Lab 3 evidence cites; this document and the working records are where AI use is disclosed instead | [student to write] |
| 8 | `เอาตามคำแนะนำนายทั้งหมดแบบละเอียดเลย` (verbatim, 5 Oct 2026). English rendering: "Follow all of your recommendations, in detail." | Checked three new audit findings itself before acting: one confirmed by reproducing it with a held database lock, one confirmed only in part (the audit said a timestamp stayed old; measurement showed it moved by 12 ms from a different clock), and one a conflict between two contracts, which it put to the student, who chose Bangkok time on every screen. It fixed all three test first. One of its own first tests passed for the wrong reason (a lazily started database call) and was corrected before it counted | [student to write] |
| 9–10 | PENDING — report and review-response prompts, recorded when they are actually used | | |

## Provenance note

Commit messages and pull request descriptions carry no AI credit line: that is the student's own rule from 4 October 2026 (entry 7), so the commit history does not show which commits an AI tool helped with. Some commits from before that rule (the merged #95 and #97, and Lab 2 and Lab 3 work) do carry a `Co-Authored-By` line naming Claude; they were left as they are, and the lines were removed from the commits of PR #98 on 5 October. AI use is disclosed here, in the private working record and in the report. Decisions are recorded in the private decision register with the student's exact answers.

## My Reflection

PENDING — the student's own reflection on specification-agent and coding-agent use.
