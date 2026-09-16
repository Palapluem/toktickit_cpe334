# L3-4 boundary proof

Issue #47. Same procedure as L3-3: the check is removed, the suite is re-run,
and the check is put back.

`requireOperation`'s refusal in `server/src/middleware/authorize.ts` was
replaced with `if (false)`, and `req.grant` defaulted to `'any'` so the handler
still ran:

```
=== with requireOperation's refusal removed ===
AssertionError: REQUESTER → ticket:setOwner: expected 200 to be 403
AssertionError: IT_STAFF → ticket:create: expected 200 to be 403
AssertionError: ADMINISTRATOR → ticket:create: expected 200 to be 403
AssertionError: expected 200 to be 403
AssertionError: expected 200 to be 403
AssertionError: user:list: expected 200 to be 403
      Tests  6 failed | 6 passed (12)

=== restored ===
      Tests  12 passed (12)
```

Six failures across all three roles: every role reaches an operation the matrix
denies it, the client-supplied role test stops meaning anything, and the
refusal-body tests have no refusal to inspect. The six that still pass are the
unauthenticated and forged-cookie cases, which `requireAuth` refuses before
authorization is consulted — which is itself the right answer, and is why 401
and 403 are separate tests rather than one.

## A routing bug these tests found

The first green run failed with `REQUESTER → ticket:setOwner: expected 200 to
be 403` and `IT_STAFF → ticket:read: expected 403 to be 200` — the wrong
operations entirely.

Express 5 reads a colon in a route path as the start of a parameter, so
`/ops/ticket:read` was registered as the literal `ticket` followed by a
parameter, and matched `/ops/ticketANYTHING`. Requests were landing on whichever
colon-bearing route was registered first.

The matrix is fine; the test harness's route paths were not. Operation names are
now slugged (`ticket:read` → `/ops/ticket-read`) so every route is literal.
Worth recording because the same trap is waiting for any real route that ever
carries a colon.
