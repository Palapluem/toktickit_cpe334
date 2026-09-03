# AI Use and Reflection - Lab 2

## Which agents and models I used

I used Claude Code in a VS Code-based IDE with Claude Sonnet 5 during the
planning and feature implementation work. I used OpenAI Codex (GPT-5-based)
to continue the handoff, inspect the merged state, run the remaining phase
gates, and prepare the Issue #23 evidence. I treated both agents as
collaborators rather than authorities: I checked the contracts, source,
GitHub state, test output, screenshots, and commit history before accepting a
result.

## Selected Key Prompts (10 of many)

The entries below are selected from the running prompt log. Thai entries are the
prompts I actually typed; the English entries are retained as they were used.

| Agent | Prompt used | What the agent did | My reflection |
|---|---|---|---|
| Claude Code / Sonnet 5 | `คือจริง ๆ อะ ตอนนี้เราอยากทำงานส่วนไหนก็ได้ ที่ยังไม่ต้องรอ Lecture 4 เพื่อความชัวร์อะ ของแลป 2 ถ้าอิงตาม syllabus และเนื้อหาที่เราเรียนไปแล้ว` | Checked the syllabus and lectures, finding that Lab 3 overlapped the Lab 2 deadline and that the testing taxonomy was already available; only the Definition of Done still needed Lecture 4 confirmation. | Asking what was actually unblocked was more useful than asking for a generic next step. |
| Codex / GPT-5 | `Read the handoff and AGENTS instructions, then continue the next phase in detail. Warn me before any screenshot work.` | Re-established the handoff rules, branch state, evidence boundary, and the requirement to warn before screenshot work. | The handoff made a short continuation prompt safe because the constraints were already written down. |
| Codex / GPT-5 | `Write the failing tests only, run them, and do not accept import/configuration failures as red evidence.` | Ran the Issue #23 red phase, separated Windows/Prisma harness failures from real assertion failures, corrected the test selectors, and preserved the valid red evidence. | A red exit code is not automatically useful evidence; I have to read why the test failed. |
| Codex / GPT-5 | `Continue the phase work in detail, and tell me what I need to screenshot.` | Completed the green E2E run at 6/6, generated the nine fixed-viewport captures, and inspected the images against the responsive contract. | This connected automated E2E evidence with the manual visual checklist instead of treating screenshots as decoration. |
| Codex / GPT-5 | `Continue the phase work in detail; complete the Issue #23 audit before opening the PR.` | Found that the first E2E harness left data behind despite passing tests, then added scoped cleanup and rechecked the suite, build, lint, style, and hygiene gates. | A disposable database is not enough by itself; test-created data still needs explicit teardown. |
| Codex / GPT-5 | `แก้ปุ่มที่แปลก ๆ ได้ไหม ถ้าไม่มีกระทบ PR เดิม` | Kept the Create Ticket alignment correction separate from the already merged implementation and opened follow-up PR #36 against `lab2-staging`. | A visual improvement should keep its own review boundary when it changes merged work. |
| Codex / GPT-5 | `ตรง memoryStorage, diskStorage เอาจริงถ้าเป็นงานนี้กับขอบเขตของงานในแลปมันควรเป็นอันไหนกว่ากันนะ หรือแบบมีแนวทางที่เหมาะสมอย่างไรบ้าง` | Compared both storage choices with the labsheet and specification, keeping local disk storage behind an adapter because attachments must persist and SeaweedFS was outside this sprint. | Asking about the trade-off before implementation prevented an easy but incorrect in-memory choice. |
| Codex / GPT-5 | `เพื่อนเรารีวิวให้แล้ว เช็คและปรับอย่างละเอียดเลยได้ไหม + คอมเมนต์ด้วย` | Audited PR #39 against the contracts, added test-first release fixes in follow-up PR #40, and kept GitHub replies manual for me to post. | Peer review exposed contract gaps that the feature-level tests had not shown, so release review deserves its own audit. |
| Codex / GPT-5 | `เพื่อนเรา merge เรียบร้อยละ เช็คอีกรอบแล้วทำตามแผนงานต่อไปได้เลย` | Rechecked the merged staging state and continued the release sequence without reopening completed Issues or creating unnecessary work. | A concise prompt worked because the current branch and process state were recorded in the handoff. |
| Codex / GPT-5 | `PR #40 เพื่อนเราคอมเมนต์ให้ละ ทำต่อเนื่องแบบละเอียดเลย` | Distinguished the deferred final `main` test table and already-satisfied 40px field rule from the one documentation gap, added the `My Reflection` heading, and recorded the disposition in `reviewer.md`. | The closed-world rule helped me answer every review point with evidence instead of changing code just to make the diff look complete. |

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
