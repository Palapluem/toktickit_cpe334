# Lab 1 Peer Review

## Reviewer
- Name: นัธทวัฒน์ ปริมสิริคุณาวุฒิ (Natthawat Primsirikunawut)
- Student ID: 67070501027
- GitHub username: N0TAW00D

## Reviews of My Pull Requests
| PR | Reviewer | Decision | Review comment | My response | Evidence link |
|---|---|---|---|---|---|
| #5 — Set up the TokTickIT project foundation | N0TAW00D | Approved | "lgtm, your structure has been following the technical specs from SA docs (lab01-cheatsheet)." / "Ready to Merge!" | "Thanks for the review! Merged into lab1-staging with a merge commit." | https://github.com/Palapluem/toktickit_cpe334/pull/5 |
| #6 — Implement the API health check (initial review) | N0TAW00D | Commented — changes requested | "Most part was great, still have an issues on error swallowing pls review it." | "Good catch — fixed in 990af85: the catch block now does `console.error('Health check failed:', error)` before setting the Offline state, instead of discarding the error. Added a test asserting the console.error call so it doesn't regress. UI message is unchanged. Ready for another look." | https://github.com/Palapluem/toktickit_cpe334/pull/6 |
| #6 — Implement the API health check (round 2, inline comment on `client/src/App.tsx`) | N0TAW00D | Commented | "also display a part of error onto the react display comp" | "Done in f46e4fd — added an errorDetail state set from error.message (or 'Unknown error' as fallback), rendered as a muted 'Details: ...' line below the required 'Unable to connect to TokTickIT API' phrase. Added a test asserting the detail shows while the required phrase stays visible." | https://github.com/Palapluem/toktickit_cpe334/pull/6#discussion_r3719997811 |
| #6 — Implement the API health check (final review) | N0TAW00D | Approved after fixes | No additional summary comment; the final review state was `APPROVED` on commit `28d9c372`. | "The requested error logging and UI detail were implemented and re-reviewed. The PR was merged into `lab1-staging` as `deb2c2c2`." | https://github.com/Palapluem/toktickit_cpe334/pull/6 |
| #7 — Create and seed IT request categories (inline comment on `server/prisma.config.ts`) | N0TAW00D | Commented — clarification requested | "Does it create duplication of command like npx and tsx execution?" | "Good question. Not logic duplication — both entry points delegate to the single prisma/seed.ts... There WAS an inconsistency though: this one used 'npx tsx' while db:seed used plain 'tsx'. Fixed in de2138c to drop the redundant npx prefix on both." | https://github.com/Palapluem/toktickit_cpe334/pull/7#discussion_r3720704697 |
| #7 — follow-up | N0TAW00D | Commented | "If you have test the migration script to real db, it's fine for me 👍🏻." | "Yes — tested against real PostgreSQL, not mocked... SELECT COUNT(*), COUNT(DISTINCT name) FROM \"Category\" returned 4, 4 — no duplicates, correct id order." | https://github.com/Palapluem/toktickit_cpe334/pull/7#discussion_r3721109163 |
| #7 — Create and seed IT request categories (final review) | N0TAW00D | Approved after clarification | No additional summary comment; the final review state was `APPROVED` on commit `ed36dfde`. | "The command inconsistency and database-seeding clarification were addressed and re-reviewed. The PR was merged into `lab1-staging` as `e35fbf5e`." | https://github.com/Palapluem/toktickit_cpe334/pull/7 |
| #9 — Display the IT request category list | N0TAW00D | Approved | "These things look great." | (no changes requested — clean approve, merged as-is) | https://github.com/Palapluem/toktickit_cpe334/pull/9 |

## My Reviews of Partner Pull Requests
| Partner PR | My decision | My review comment | Partner response | Evidence link |
|---|---|---|---|---|
| N0TAW00D/TokTickIT #5 — Project foundation: React+Vite client, Express+Prisma server, Postgres, tests | Approved | "Well done Natthawat!, That’s look good so far." | Merged, no further reply needed | https://github.com/N0TAW00D/TokTickIT/pull/5 |
| N0TAW00D/TokTickIT #6 — Add health check endpoint | Approved | "You are doing it well so far!" | Merged after review comments were addressed | https://github.com/N0TAW00D/TokTickIT/pull/6 |
| N0TAW00D/TokTickIT #7 — Add Category model, migration, and seeding | Approved | "Good job for this task!!!" | Merged after review comments were addressed | https://github.com/N0TAW00D/TokTickIT/pull/7 |
| N0TAW00D/TokTickIT #8 — Add category list endpoint and UI | Approved | "Good job, Natthawat! It's nice to see your final product in this repo for now!" | Merged after review comments were addressed | https://github.com/N0TAW00D/TokTickIT/pull/8 |
| N0TAW00D/TokTickIT #12 — Lab 1 Release (`lab1-staging` → `main`) | Approved | "Well done, Natthawat. Thanks for our good collaboration in this work!" | Merged into `main` after the release review | https://github.com/N0TAW00D/TokTickIT/pull/12 |

## Review Outcome
All four feature PRs (#5, #6, #7, #9) received real reviews from N0TAW00D and were merged into `lab1-staging` via merge commits. Two PRs (#6, #7) went through a real fixing cycle first — genuine defects or clarifications (error swallowing, a missing error detail in the UI, and an inconsistent seed command) were addressed on the same branches and re-reviewed before approval. PRs #5 and #9 were approved cleanly on the first pass. In the other direction, I reviewed and approved N0TAW00D's partner PRs #5, #6, #7, #8, and #12; each was subsequently merged.
