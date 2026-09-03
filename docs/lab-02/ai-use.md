# AI Use and Reflection - Lab 2

## Which agents and models I used

I used Claude Code in a VS Code-based IDE with Claude Sonnet 5 during the
planning and feature implementation work. I used OpenAI Codex (GPT-5-based)
to continue the handoff, inspect the merged state, run the remaining phase
gates, and prepare the Issue #23 evidence. I treated both agents as
collaborators rather than authorities: I checked the contracts, source,
GitHub state, test output, screenshots, and commit history before accepting a
result.

## Selected key prompts

| Prompt | What the agent did | My reflection |
|---|---|---|
| Read `HANDOFF.md` and `AGENTS.md` in the required order. Tell me the next Issue, its blocker, and current test counts before writing code. | Established the handoff rules, the reviewer-merge rule, the current `lab2-staging` commit, and the next Issue. | Starting from the handoff stopped the work from reopening settled decisions or using the wrong repository. |
| Run the phase-1 contract review for Issue #23 against `tests.md`, `ui-spec.md`, `style-contract.md`, and `specification.md` before writing code. | Found the missing E2E database isolation choice, the exact screenshot-path requirement, the staging-candidate versus final-main contradiction, and the missing AI-use document. | Reviewing the documents together exposed workflow gaps that a test file alone would not show. |
| Issue #23: write the failing tests only. Configure Playwright and show assertion failures, not import/configuration failures. | Added the E2E/responsive seams and captured the first failures. Several setup problems were caught and recorded before the test result was interpreted. | A red terminal exit is not automatically useful red evidence; the failure reason must be read. |
| Continue Issue #23 through the phases in detail, and warn me whenever screenshots are required. | Corrected two test assertions, ran all six tests green, and generated the nine reproducible viewport screenshots. | This kept the automated evidence and the manual visual-review task connected to the same run. |
| Check whether the CSS alignment follow-up changes the already merged work before opening a PR. | Confirmed the form-control fix was a separate, reviewable follow-up and opened PR #36 against `lab2-staging`. | Separating the follow-up preserved the scope and review history of the merged ticket-creation work. |
| Check the latest merged PR and continue the plan, but do not post GitHub comments or reviews for me. | Verified PR #35 merged into `lab2-staging`, kept GitHub conversation actions manual, and updated the private handoff with the current stage. | The agent can prepare evidence and commands, but peer-review communication and merge ownership stay with me and my reviewer. |

## My Reflection

The most useful prompts named the exact repository, phase, source documents,
and forbidden actions. The handoff also made it easier to ask for evidence
instead of a vague status report. I learned to separate three questions that
are often mixed together: whether the product behaves correctly, whether the
test proves it, and whether the GitHub workflow records it correctly.

I still make the final decisions about scope, review replies, screenshot
acceptance, and release readiness. The agents execute inspections and local
changes, but I verify the output and perform the peer-review actions in the
browser myself.
