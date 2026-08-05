# AI Use and Reflection

## Which agent I used

I used **Claude Code**, Anthropic's terminal-based coding agent, inside VS Code, with the **Claude Sonnet 5** model. Section 5 of the lab sheet says the course will most likely use Antigravity, but that was not what I had available. The lab sheet itself also allows any VS Code based IDE with an integrated AI coding assistant more generally, so I went with that.

The `grill-with-docs` skill named in the master prompt was not installed in this environment. Rather than skip that step, I had the agent actually run the install command in the outer workspace, then read the installed skill's own instruction files so it could still run the same one question at a time interview manually, since the freshly installed skill was not recognized mid session. It then asked me one decision at a time, covering the private materials location, database strategy, backend port, request orchestration, and evidence storage, before any code was written.

## Tools and Models

- IDE/agent: Claude Code (VS Code extension)
- LLM/model: Claude Sonnet 5
- Thinking level or mode: default, not manually configured for this session
- How AI was used: specification and alignment, test-first design, full-stack implementation, debugging, drafting real peer-review responses, Git and GitHub workflow execution, documentation

## Selected Key Prompts

| Prompt Name | Actual Prompt Text | My Reflection |
|---|---|---|
| Kick off the engineering contract | "Please help me follow the Master Prompt in detail. Also, don't commit this file to either repo." | Saying "in detail" up front meant the agent spent a good amount of time on read only investigation first, checking the repo state, tool versions, and source PDFs before touching anything, instead of jumping straight into code. The one specific constraint I added, about not committing that file, turned out to matter later because it shaped the `.gitignore` design from the very first commit. |
| Decide how to get grill-with-docs | "Go ahead and actually try installing it." | I could have let the agent fake the grill process without the real skill installed. Insisting on the real install surfaced a real limitation, since the session could not actually see the newly installed skill, and that is something a simulated answer would have hidden. The agent ended up reading the skill's own source files just to follow it properly. |
| Lock in the database and UI design decisions | "Separate dev and test databases, recommended." / "Fire them sequentially." | These were fast decisions because the agent had already framed each one as a short trade-off with a clear recommendation rather than an open question. I did not really have to design anything myself, just pick a side once the trade-off was laid out. |
| Approve scope and defer the peer reviewer | "Let's do this. I'll find a peer reviewer later, not needed now, but do all the other work correctly and in detail." | This let implementation start right away without waiting on something outside my control. It also meant the agent had to track a real dependency properly, since Issue 2 and Issue 3 could not branch until Issue 1 was merged, which needed a real peer, instead of faking review evidence just to keep moving. |
| Verify local Postgres access | "Does 1234 work?" | This was the shortest prompt I sent all session, and it still worked fine. By that point there was enough shared context about which database and which user that a four character message was completely unambiguous. Not every prompt needs to be long to be clear. |
| Catch a Git workflow mistake | "Check something for me, there seem to be 2 pull requests, what should we do?" | I noticed the accidental `lab1-staging` to `main` pull request before the agent did. It came from clicking GitHub's own "Compare and pull request" banner, not from anything the agent had done. Flagging it early meant it got closed instead of accidentally merged later. |
| Draft a real review response | "What comment should we write for this?" | The agent explained why the reviewer's specific concern about error swallowing was valid, tying it back to an actual line in the lab sheet, before writing any fix or reply. That felt more useful than just agreeing and patching something without understanding why. |
| Evaluate an external reference against approved work | "The TA just attached a Lab 1 Starter Scaffold, do we need to fix ours to match? Would it even affect the Issues our friend already reviewed?" | The agent compared every file in the scaffold against what we had already built instead of guessing from the folder names, and the answer turned out to be no. Reworking merged and reviewed code just to match someone else's naming choices would have cost real re-review effort for no actual benefit under the rubric. |

## What I remain responsible for

The agent wrote the code, but the decisions and the verification are mine. These are the ones I was asked about explicitly, each of which could have gone the other way.

| Decision | What I chose | What I gave up |
|---|---|---|
| Course PDFs | Keep the originals in `labs/Lab01/` and `lectures/` as is, and copy them into an ignored `_private/` path | Moving the originals into `_private/` directly, which is what the master prompt literally suggested |
| Database | Two databases, `toktickit_dev` and `toktickit_test`, on one local PostgreSQL instance | One shared database, which is simpler but risks test runs polluting dev data |
| Backend port | 3001 | 3000, the more conventional Node default, but one that clashes with common frontend dev tool defaults |
| Check System request order | Sequential, calling `/api/health` first and `/api/categories` only if that succeeds | Parallel requests, which are faster but harder to reason about when only one call fails |
| Evidence storage | `_private/evidence/lab-01/` in the outer, non-graded repo | Storing screenshots inside the graded repo, which would bloat it with non-source content |
| Peer reviewer | Collaborator access on my repo set to Read | Write access, which N0TAW00D did not need just to review and approve PRs |

## Reflection

My prompts got better mainly by getting shorter, not longer. Once the agent had built up real context from the alignment report, the grill answers, and the running acceptance criteria checklist for each Issue, a few words were enough to move things forward correctly.

The one place I had to actively correct the process rather than just approve it was Git workflow discipline. I stopped an accidental `lab1-staging` to `main` pull request from a GitHub UI banner before it could be merged out of order. I also had my own understanding corrected once, since I initially thought my partner would open pull requests directly in my repo, when the actual model is that they only review the ones I open, in their own separate repo.

Both of those moments were about process rather than code. The actual implementation only needed real fixes twice, both from genuine review feedback about error swallowing and a missing UI detail, and both fixes stayed scoped to exactly what was asked.
