# L3-3 boundary proof

Issue #46. `tests.md` §1 sets the rule this answers:

> Authorization tests are boundary tests, not red-green cycles. They pass the
> moment the middleware exists, so they cannot fail first in a meaningful way.
> The way to confirm one is real is to **remove the check locally, watch the
> test fail, and put it back**. A boundary test earns its place by failing when
> the boundary is removed — not by failing before it is built.

Both guards in `server/src/middleware/authContext.ts` were neutered in turn and
the suite re-run.

## The must-change gate

`requirePasswordChanged` — condition replaced with `if (false)`:

```
=== with the must-change gate removed ===
AssertionError: expected 200 to be 403
AssertionError: expected 200 to be 403
      Tests  2 failed | 2 passed | 20 skipped (24)

=== gate restored ===
      Tests  4 passed | 20 skipped (24)
```

The two that survived are the ones that should: `GET /api/auth/me` is exempt
from the gate by design, and the unauthenticated call is refused by
`requireAuth` before the gate is reached.

## Authentication

`requireAuth` — the `user === null` refusal replaced with `if (false)`:

```
=== with the 401 check removed from requireAuth ===
AssertionError: expected 200 to be 401
AssertionError: expected 200 to be 401
AssertionError: expected 200 to be 401
      Tests  3 failed | 21 passed (24)

=== restored ===
      Tests  24 passed (24)
```

Three tests fail: the logged-out session is accepted again, the guarded
endpoint admits an anonymous caller, and a password change ends nothing because
there is no session to end. Each is a distinct consequence of the same removed
line, which is what makes the coverage worth having rather than redundant.
