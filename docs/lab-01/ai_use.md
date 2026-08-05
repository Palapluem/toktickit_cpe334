# AI Use and Reflection

## Which agent I used

I used **Claude Code** (Anthropic's terminal-based coding agent) inside VS Code,
with the **Claude Sonnet 5** model. §5 of the lab sheet says the course will
"most likely" use Antigravity — that's not what I had available, and the lab
sheet itself allows "a VS Code-based IDE that includes an integrated AI coding
assistant" more generally, so I went with that.

`grill-with-docs` (the skill the master prompt names) wasn't installed in this
environment. Rather than skip the step, I had the agent actually run
`npx skills@latest add mattpocock/skills --skill=grill-with-docs` in the outer
workspace, then read the installed skill's own instruction files
(`grill-with-docs` → `grilling` + `domain-modeling`) so it could run the same
one-question-at-a-time interview manually, since the freshly installed skill
wasn't recognized mid-session. It then asked me one decision at a time —
private-materials location, database strategy, backend port, request
orchestration, evidence storage — before any code was written.

## Tools and Models
- IDE/agent: Claude Code (VS Code extension)
- LLM/model: Claude Sonnet 5
- Thinking level or mode: default (not manually configured for this session)
- How AI was used: specification/alignment, test-first design, full-stack implementation, debugging, drafting real peer-review responses, Git/GitHub workflow execution, documentation

## Selected Key Prompts

| Prompt Name | Actual Prompt Text | My Reflection |
|---|---|---|
| Kick off the engineering contract | "Please help me follow the Master Prompt in detail. Also — don't commit this file to either repo." | _(your reflection)_ |
| Decide how to get grill-with-docs | "Go ahead and actually try installing it." | _(your reflection)_ |
| Lock in the DB/UI design decisions | "Separate dev/test databases (recommended)." / "Fire them sequentially." | _(your reflection)_ |
| Approve scope and defer the peer reviewer | "Let's do this — I'll find a peer reviewer later, not needed now, but do all the other work correctly and in detail." | _(your reflection)_ |
| Verify local Postgres access | "Does 1234 work?" | _(your reflection)_ |
| Catch a Git workflow mistake | "Check something for me — there seem to be 2 pull requests, what should we do?" | _(your reflection)_ |
| Draft a real review response | "What comment should we write for this?" | _(your reflection)_ |
| Evaluate an external reference against approved work | "The TA just attached a Lab 1 Starter Scaffold — do we need to fix ours to match? Would it even affect the Issues our friend already reviewed?" | _(your reflection)_ |

## What I remain responsible for

The agent wrote the code, but the decisions and the verification are mine.
These are the ones I was asked about explicitly, each of which could have gone
the other way:

| Decision | What I chose | What I gave up |
|---|---|---|
| Course PDFs | Keep originals in `labs/Lab01/` and `lectures/` as-is, copy into an ignored `_private/` path | Moving the originals into `_private/` directly, per the master prompt's literal suggestion |
| Database | Two databases — `toktickit_dev` and `toktickit_test` on one local PostgreSQL instance | One shared database, which is simpler but risks test runs polluting dev data |
| Backend port | 3001 | 3000, the more conventional Node default, but one that clashes with common frontend dev-tool defaults |
| Check System request order | Sequential — `/api/health` first, then `/api/categories` only if that succeeds | Parallel requests, which is faster but harder to reason about when only one call fails |
| Evidence storage | `_private/evidence/lab-01/` in the outer (non-graded) repo | Storing screenshots inside the graded repo, which would bloat it with non-source content |
| Peer reviewer | Palapluem-side repo Collaborator invited with **Read** access | Write access, which N0TAW00D didn't need just to review and approve PRs |

## Reflection
_(2–3 sentences from you. Some real things from this session you could write
about — only use what's actually true for you:)_
- _The agent caught itself mid-way that `feature/2-health-check` couldn't
  legally be created until Issue 1 was merged, and stopped rather than
  branching from a stale `lab1-staging`. Was that the right call, or annoying?_
- _You caught the accidental `lab1-staging → main` pull request (#8) before
  the agent did — what tipped you off?_
- _Two PRs (#6, #7) needed a real Fixing round after review (error swallowing,
  a missing UI detail, an inconsistent seed command). Did the fixes match what
  was actually asked, or go further than needed?_
- _What in the final app can you explain to someone else without looking
  anything up, and what would you have to go check first?_
