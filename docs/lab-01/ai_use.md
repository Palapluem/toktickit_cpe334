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
| Kick off the engineering contract | "Please help me follow the Master Prompt in detail. Also — don't commit this file to either repo." | Saying "in detail" up front meant the agent front-loaded a lot of read-only investigation (repo state, tool versions, source PDFs) before touching anything, instead of jumping straight to code. The one specific constraint I added ("don't commit this file") turned out to matter later — it shaped the `.gitignore` design from the very first commit. |
| Decide how to get grill-with-docs | "Go ahead and actually try installing it." | I could have let the agent fake the grill process without the real skill installed. Insisting on the real install surfaced a real limitation (the session couldn't see the newly installed skill) that a simulated answer would have hidden — the agent had to read the skill's own source files to actually follow it. |
| Lock in the DB/UI design decisions | "Separate dev/test databases (recommended)." / "Fire them sequentially." | These were fast decisions because the agent had already framed each one as a short trade-off with a recommendation, not an open question. I didn't have to design anything — just pick a side once the trade-off was laid out. |
| Approve scope and defer the peer reviewer | "Let's do this — I'll find a peer reviewer later, not needed now, but do all the other work correctly and in detail." | This let implementation start immediately without blocking on something outside my control, but it also meant the agent had to track a real dependency (Issue 2/3 can't branch until Issue 1 merges, which needs a real peer) instead of faking review evidence just to keep moving. |
| Verify local Postgres access | "Does 1234 work?" | Shortest prompt I sent all session, and it still worked — by that point enough shared context existed (which database, which user) that a four-character message was unambiguous. Not every prompt needs to be long to be clear. |
| Catch a Git workflow mistake | "Check something for me — there seem to be 2 pull requests, what should we do?" | I noticed the accidental `lab1-staging → main` PR before the agent did — it came from clicking GitHub's own "Compare & pull request" banner, not from anything the agent did. Flagging it early meant it got closed instead of accidentally merged. |
| Draft a real review response | "What comment should we write for this?" | The agent explained why the reviewer's specific concern (error swallowing) was valid — tying it back to an actual line in the lab sheet — before writing a fix or a reply, rather than just agreeing and patching something. |
| Evaluate an external reference against approved work | "The TA just attached a Lab 1 Starter Scaffold — do we need to fix ours to match? Would it even affect the Issues our friend already reviewed?" | The agent diffed every file in the scaffold against what we'd already built instead of guessing from the folder names, and the answer was no — reworking merged, reviewed code to match someone else's naming choices would have cost real re-review effort for zero rubric benefit. |

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

My prompts got better mainly by getting shorter, not longer — once the agent
had built up real context (the alignment report, the grill answers, the
running acceptance-criteria checklist per Issue), a few words was enough to
move things forward correctly. The one place I had to actively correct the
process rather than just approve it was Git workflow discipline: I stopped an
accidental `lab1-staging → main` pull request from a GitHub UI banner before
it could be merged out of order. I also had my own understanding corrected
once — I initially thought my partner would open PRs directly in my repo,
when the actual model is that they only review the ones I open, in their own
separate repo. Both moments were about process, not code — the actual
implementation only needed real fixes twice,
both from genuine review feedback (error swallowing, a missing UI detail),
and both fixes stayed scoped to exactly what was asked.
