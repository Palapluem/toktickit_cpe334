# AI Use and Reflection - Lab 1

## Which agent and model I used

I used **Claude Code** in a VS Code-based IDE with **Claude Sonnet 5** at the default thinking level. The lab sheet says the course would most likely use Antigravity, but it also allows a VS Code-based IDE with an integrated AI coding assistant. I used Claude Code to read the requirements, plan the work, implement and test the application, explain review feedback, and verify Git/GitHub workflow decisions.

I did not treat the agent's first answer as something to follow blindly. I checked the requirements, repository state, generated files, test results, review feedback, and branch history before accepting changes.

## Tools and Models

- IDE/agent: Claude Code (VS Code extension)
- LLM/model: Claude Sonnet 5
- Thinking level or mode: default
- How AI was used: requirements analysis, implementation planning, full-stack coding, test design, debugging, peer-review discussion, and Git/GitHub workflow guidance

## Selected Key Prompts

| Prompt Name | Prompt Text | My Reflection |
|---|---|---|
| Establish the Lab 1 execution contract | I am starting CPE334 Software Engineering Lab 1. Follow the complete instructions in `TokTickIT_Lab1_Master_Prompt.md` in detail. Treat this file as planning-only and do not commit it to either repository. | I set this boundary before implementation began because I wanted the requirements and repository rules kept separate from the graded source code. |
| Validate the feature-branch workflow | I currently see `main`, `lab1-staging`, and feature branches for Issues 1-4. Compare this state with the Lab 1 dependency order before creating or deleting anything. Should feature branches be created only when their predecessor is ready, or all at once? Do not copy another repository's branch layout without checking the rule. | I almost treated my friend's branch list as a template. This made me understand that branch timing matters because each feature must start from the correct staging state. |
| Confirm PR ownership and review gates | Please clarify the peer-review workflow for the Issue pull requests. Should my peer open PR #5 and the remaining PRs, or should I open each feature PR and ask my peer to review it? State the approval and merge gate that must be satisfied before the next dependent Issue starts. | I was confused about who creates a PR and who reviews it. Asking this clarified the workflow I followed for the rest of the lab. |
| Verify repository structure against the lab sheet | My peer says that the `docs/` directory is missing from `main`. Compare the repository with the lab sheet and the required graded-repository structure. Identify what is actually required, and exclude lecture-only materials from the graded repository. | I learned to compare the repository with the actual requirement instead of reacting to a single comment or copying another project's file layout. |
| Complete the same-branch review cycle | A reviewer has identified changes on the current feature branch. Confirm whether I must fix and verify those changes on the same branch before requesting another review, and explain what evidence should be preserved. | This showed me that review is a development gate, not just a comment to answer. The fix must remain connected to the PR being reviewed. |
| Investigate duplicate pull requests before merging | There are two pull requests in the repository. Inspect their base branches, states, and scope. Determine whether either one is an early release PR and which action is valid under the Lab 1 dependency order. Do not merge anything prematurely. | I noticed that the GitHub interface could make an early release look ready. Checking the branch targets first prevented an out-of-order merge. |
| Evaluate the late starter scaffold | The TA has provided a `Lab1_Starter_Scaffold` after several Issues have already been implemented and peer-reviewed. Compare it with the lab sheet and the current repository. Separate mandatory behavior from naming or formatting differences, and explain whether any change would invalidate reviewed Issues or require re-review. | I was worried that the late scaffold meant I had to rewrite completed work. Comparing requirements helped me avoid unnecessary changes and re-review. |
| Analyze the seed-command review question | The reviewer asked whether `npx tsx prisma/seed.ts` creates duplicate command execution. Analyze the Prisma configuration, package scripts, and actual seed path. Determine whether a real defect exists, then draft a concise, evidence-based response. Change the code only if the analysis finds an actual problem. | I did not want to reply with a vague assurance without understanding the concern. The explanation connected the review comment to the actual command flow and migration behavior. |

## Reflection on Improving My Prompts

At this moment, My prompts became more effective when I named the artifact I was looking at, the Lab 1 rule involved, the uncertainty I needed to resolve, and the decision I wanted from the agent. At the beginning, I sometimes sent very short questions because the surrounding context was already shared. Later, I learned that a strong engineering prompt should make that context explicit instead of relying on the agent to guess.

The most important improvement was not making every prompt longer. It was making the expected outcome and constraints precise. For example, a question about two pull requests became an instruction to inspect their base branches and merge order, while a question about a reviewer comment became a request for an evidence-based analysis before any code change.

I still made the final decisions about branch order, pull-request state, review fixes, and whether the late scaffold actually required changes. The agent executed many steps, but the responsibility for understanding and approving the result remained mine.
