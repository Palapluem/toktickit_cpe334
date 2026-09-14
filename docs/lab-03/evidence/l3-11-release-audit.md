# L3-11 release audit — what the Definition of Done check found

Issue #54. Run against `specification.md` §10 on the merged feature set, with
one rule: **check the repository, not the plan.** Every item below was found by
that rule, and none of them were visible from the PR history.

## 1. The increment had not reached `lab3-staging`

Ten PRs reported `MERGED`. `lab3-staging` held two of them.

```
$ git log --oneline origin/lab3-staging -1
85e81aa Merge pull request #56 …

$ git log --oneline origin/lab3-staging..origin/feature/22-user-management | wc -l
31

$ git cat-file -e origin/lab3-staging:server/src/auth/matrix.ts
fatal: Not a valid object name
```

`matrix.ts`, `staffQueue.ts`, `threads.ts`, `Login.tsx`, `StaffTicketQueue.tsx`
and `UserManagement.tsx` were all absent from staging.

Cause and remedy are recorded in `reviewer.md` §1.1. Resolved by PR #65.

## 2. Test-plan file paths did not match delivery

Nine rows of `tests.md` §2 named a path nobody wrote:

```
$ awk '/^## 2\./,/^## 3\./' docs/lab-03/tests.md \
    | grep -oE '`[a-z0-9/_.-]+\.(test|spec)\.tsx?`' | tr -d '`' | sort -u \
    | while read f; do test -f "$f" || echo "MISSING $f"; done

MISSING client/tests/lab-03/style/lab3-screens.test.tsx
MISSING e2e/lab-03/responsive.spec.ts
MISSING e2e/lab-03/staff-ticket-flow.spec.ts
MISSING e2e/lab-03/user-administration.spec.ts
MISSING server/tests/lab-03/comments-notes.api.test.ts
MISSING server/tests/lab-03/content.unit.test.ts
MISSING server/tests/lab-03/migration.api.test.ts
MISSING server/tests/lab-03/staff-ticket-detail.api.test.ts
MISSING server/tests/lab-03/users-admin.api.test.ts
```

Every one turned out to be a rename or a split, not a gap — `SEC-T04`, for
instance, is delivered by `server/tests/lab-02/attachments.api.test.ts` API-28
running on authenticated identity. The `File` column now names where each test
actually lives.

## 3. MIG-05 had no automated guard

`AC-15` requires the Development Requester selector to be gone. The evidence
for it was a grep run by hand in `l3-5-green.txt` — nothing would have caught
its reintroduction. Added `server/tests/lab-03/selector-removed.unit.test.ts`,
and confirmed it is a real boundary test rather than a vacuous one:

```
# with a file containing the string X-Requester-Id restored to server/src
× sends no X-Requester-Id header from any client or server source file
Tests  1 failed | 2 passed (3)

# with it removed again
Tests  3 passed (3)
```

## 4. Two screens were missing their tablet capture

`AC-34` names three viewports. Authentication and User Management had two.

| Screen | Before | After |
|---|---|---|
| authentication | desktop, mobile | desktop, tablet, mobile |
| staff-queue | all three | unchanged |
| staff-ticket-detail | all three | unchanged |
| user-management | desktop, mobile | desktop, tablet, mobile |

`ADMIN-01` also named its captures with a binary `mobile ? … : desktop`
ternary, so adding tablet would have silently overwritten the desktop file.
Fixed to use the viewport's own name.

## 5. An unhandled rejection in the client suite

`npm test` in `client/` reported `Errors 1` alongside its 199 passes:

```
Unhandled Rejection
Error: network
 ❯ tests/lab-03/AppShell.test.tsx:145:34  logoutMock.mockRejectedValue(new Error('network'))
```

`AppShell.signOut` used `try { await logout() } finally { … }` with no `catch`,
so a failed logout escaped the click handler as an unhandled rejection. The
cleanup was already correct; only the rejection was unhandled. Now swallowed
deliberately, with the reason stated.

## 6. Final suite state

Run on `feature/23-e2e-and-release` with the complete feature set merged.

| Suite | Command | Result |
|---|---|---|
| Server — unit, API, security, migration | `cd server && npm test` | **406 passed** (28 files) |
| Client — UI component and style | `cd client && npm test` | **199 passed** (24 files) |
| E2E and responsive | `npm run test:e2e` | **33 passed** |
| **Total** | | **638 passed, 0 failed, 0 skipped** |

`tests.md` §6 stays deferred until the release merge, per its own rule — those
numbers must come from `main`, not from this branch.
