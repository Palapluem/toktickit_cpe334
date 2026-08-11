# AI Use and Reflection — Lab 1

## Which agent and model I used

I used **Claude Code** in a VS Code-based IDE with **Claude Sonnet 5** at the default thinking level. The lab sheet says the course would most likely use Antigravity, but it also allows a VS Code-based IDE with an integrated AI coding assistant. I used Claude Code to read the requirements, help with implementation and tests, explain review feedback, and check Git/GitHub workflow steps.

I did not treat the agent's first answer as something to follow blindly. When I was unsure about a database login, branch order, pull request state, a reviewer comment, or a late starter scaffold, I stopped and asked before changing the repository.

## Tools and Models

- IDE/agent: Claude Code (VS Code extension)
- LLM/model: Claude Sonnet 5
- Thinking level or mode: default
- How AI was used: reading the Lab 1 requirements, planning, implementation and tests, debugging, review-feedback discussion, and Git/GitHub workflow guidance

## Selected Key Prompts

| Prompt Name | Actual Prompt Text | My Reflection |
|---|---|---|
| Start Lab 1 and protect the instruction file | "สวัสดีนาย ตอนนี้เรากำลังทำรายวิชา CPE334 Software Engineering นะ ซึ่งวันนี้เรามี Lab 01 ให้ทำตามละเอียดทั้งหมดแล้วใน `TokTickIT_Lab1_Master_Prompt.md` โดยที่อยากให้นายช่วยทำตาม Prompt แบบละเอียดเลย แล้วก็ไฟล์นี้ห้าม commit ทั้ง 2 repo" *(English: Read the Lab 1 master prompt carefully, and do not commit that file to either repository.)* | I gave one important limit at the start: the planning file must not enter either repository. I wanted the requirements checked before code was written, because I did not want to fix a workflow mistake after commits had already been made. |
| Verify local PostgreSQL access | "`[local PostgreSQL password]` เข้าได้มั้ย" *(English: Does the local PostgreSQL password work? The password is redacted here.)* | I had not confirmed that the database account worked yet. Once the login was confirmed, I could continue with Prisma setup instead of guessing whether a later failure came from the application or the database connection. The prompt was short, but the database context was already clear. |
| Check whether to create all feature branches | "แปปนะ สร้าง branch ครบแล้วใช่ปะ ... เราเห็นเพื่อนเราทำงี้ ถ้าไม่ต้องทำก็บอกได้" *(English: My friend has all the feature branches already. Do I need to create them all too?)* | I almost copied the branch list that I saw in another repository. I stopped and asked first, then learned that creating every branch early would start some work from the wrong state. I should create the next branch only when its dependency is ready. |
| Understand the peer-review flow | "เพื่อนเราต้องทำ PR #5 ก่อนใช่มั้ย หรือทำทั้งหมดที่เหลือ?" *(English: Does my friend need to do PR #5 first, or all of the remaining work?)* | I was mixing up who opens a pull request and who reviews it. Asking this changed my plan: I open the PR for my own Issue, then my peer reviews it before I move on. That distinction mattered for every later Issue. |
| Fix feedback before requesting review again | "งั้นต้องแก้ก่อนที่เพื่อนจะกด Request Review ใช่มั้ย" *(English: So I need to fix it before asking my peer to review it again, right?)* | This was when I understood that review is not only a checkbox. I kept the correction on the same feature branch before asking for another review, so the peer could see the actual fix instead of a separate, unrelated change. |
| Stop an early release pull request | "เช็คหน่อย มันมี 2 pull requests เราต้องทำไง" *(English: Please check: there are two pull requests. What should I do?)* | I noticed that something did not look right and did not merge either PR immediately. I learned that `lab1-staging` can go to `main` only after all four Issues are complete, so the early release PR had to be closed rather than merged. |
| Evaluate the late starter scaffold | "TA เขาเพิ่งแนบ `Lab1_Starter_Scaffold` แล้วเราต้องทำไงต่อ ต้องแก้มั้ย หรือไม่จำเป็น ... แต่มันจะกระทบทุก issues ที่เราให้เพื่อนตรวจเลยมั้ยนะ" *(English: The TA just attached a starter scaffold. Do I need to change my work, and would that affect the Issues my peer already reviewed?)* | I was worried that the late scaffold meant I had to rewrite finished work. Comparing it with the actual Lab 1 requirements helped me separate required behaviour from different naming, port, and folder choices. I did not change reviewed code just to make it look like the scaffold. |
| Respond to the seed-command review comment | "Does it create duplication of command like npx and tsx execution? ... อันนี้เราต้องเขียน comment ว่าอะไร" *(English: What should I reply to this reviewer question about the `npx tsx` seed command?)* | I did not understand the comment well enough to answer immediately. I needed the explanation tied to the real migration and seed checks before replying. This taught me that a review response should be backed by an actual check, not only a polite "it is fine." |

## Reflection on Improving My Prompts

At the beginning, I expected one long instruction to cover almost everything. During the lab, I learned to stop and ask one small question when a decision could affect branch order, pull request state, or code that had already been reviewed. Short Thai prompts worked when the context was already shared, but I still had to say what I was seeing instead of only asking "what next?"

The biggest lesson for me was not to copy a friend's branch list, a GitHub banner, or a starter scaffold without checking the Lab 1 rule behind it. Those situations looked simple at first, but each one could have changed the Git workflow or created unnecessary re-review work.

For review feedback, I learned to ask for the reason before I replied or changed code. That helped me connect a comment to the actual requirement and keep the fix limited to the problem that was found.
