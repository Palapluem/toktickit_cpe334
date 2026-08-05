# Lab 1 Peer Review

## Reviewer
- Name: นัธทวัฒน์ ปริมสิริคุณาวุฒิ (Natthawat Primsirikunawut)
- Student ID: 67070501027
- GitHub username: N0TAW00D

## Reviews of My Pull Requests
| PR | Reviewer | Decision | Review comment | My response | Evidence link |
|---|---|---|---|---|---|
| #5 — Set up the TokTickIT project foundation | N0TAW00D | Approved | "lgtm, your structure has been following the technical specs from SA docs (lab01-cheatsheet)." / "Ready to Merge!" | "Thanks for the review! Merged into lab1-staging with a merge commit." | https://github.com/Palapluem/toktickit_cpe334/pull/5 |
| #6 — Implement the API health check | N0TAW00D | Commented (changes requested informally) | "Most part was great, still have an issues on error swallowing pls review it." | "Good catch — fixed in 990af85: the catch block now does `console.error('Health check failed:', error)` before setting the Offline state, instead of discarding the error. Added a test asserting the console.error call so it doesn't regress. UI message is unchanged. Ready for another look." | https://github.com/Palapluem/toktickit_cpe334/pull/6 |
| #6 — Implement the API health check (round 2, inline comment on `client/src/App.tsx`) | N0TAW00D | Commented | "also display a part of error onto the react display comp" | "Done in f46e4fd — added an errorDetail state set from error.message (or 'Unknown error' as fallback), rendered as a muted 'Details: ...' line below the required 'Unable to connect to TokTickIT API' phrase. Added a test asserting the detail shows while the required phrase stays visible." | https://github.com/Palapluem/toktickit_cpe334/pull/6#discussion_r3719997811 |
| #7 — Create and seed IT request categories (inline comment on `server/prisma.config.ts`) | N0TAW00D | Commented | "Does it create duplication of command like npx and tsx execution?" | "Good question. Not logic duplication — both entry points delegate to the single prisma/seed.ts... There WAS an inconsistency though: this one used 'npx tsx' while db:seed used plain 'tsx'. Fixed in de2138c to drop the redundant npx prefix on both." | https://github.com/Palapluem/toktickit_cpe334/pull/7#discussion_r3720704697 |
| #7 — follow-up | N0TAW00D | Commented | "If you have test the migration script to real db, it's fine for me 👍🏻." | "Yes — tested against real PostgreSQL, not mocked... SELECT COUNT(*), COUNT(DISTINCT name) FROM \"Category\" returned 4, 4 — no duplicates, correct id order." | https://github.com/Palapluem/toktickit_cpe334/pull/7#discussion_r3721109163 |
| #9 — Display the IT request category list | N0TAW00D | Approved | "These things look great." | (no changes requested — clean approve, merged as-is) | https://github.com/Palapluem/toktickit_cpe334/pull/9 |

## My Reviews of Partner Pull Requests
| Partner PR | My decision | My review comment | Partner response | Evidence link |
|---|---|---|---|---|
| _pending — will be added once N0TAW00D opens a PR to review_ | | | | |

## Review Outcome
All four feature PRs (#5, #6, #7, #9) received real reviews from N0TAW00D and were merged into `lab1-staging` via merge commits. Two PRs (#6, #7) went through a real Fixing cycle first — genuine defects (error swallowing, a missing error detail in the UI, an inconsistent seed command) were flagged, fixed on the same branch, and re-reviewed before approval. PRs #5 and #9 were approved cleanly on the first pass. Reciprocal review of the partner's repository is still outstanding.
