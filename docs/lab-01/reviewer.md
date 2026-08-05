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

## My Reviews of Partner Pull Requests
| Partner PR | My decision | My review comment | Partner response | Evidence link |
|---|---|---|---|---|
| _pending — will be added once N0TAW00D opens a PR to review_ | | | | |

## Review Outcome
PR #5 (Issue 1) received a real Approve from N0TAW00D with a substantive comment confirming the repository structure matched the CheatSheet's technical spec, followed by a formal Approve review and a real response from the author. Merged via a merge commit into `lab1-staging`. Reciprocal review of the partner's repository is still outstanding.
