# Security Contract

**Version:** 1.0 — approved for implementation, 11 September 2026

The enforcement gate for this sprint's security work, in the same shape as `style-contract.md`: short enough to run against a diff, with a stable identifier per rule so a review comment or a test name can cite one instead of restating it.

`specification.md` and `api-spec.md` remain the source of truth for *what* the system does. This file is *what must be true of it regardless*, derived from Lecture 5 — particularly its design checklist (p39) and security-testing categories (p38).

Rules are `SEC-###`. Cite them in test names, review comments, and the Part 7 authorization evidence.

---

## 1. Authentication

- **SEC-001** Only an **active** user with valid credentials may authenticate. A correct password on a deactivated account fails exactly as a wrong password does (Lecture 5 p10).
- **SEC-002** Authentication failure returns one generic message. Never "email exists but password is wrong", never "this account is inactive because…", never anything that distinguishes an unknown email from a wrong password (p17).
- **SEC-003** The current-user endpoint returns the safe profile and access state only — never a password, hash, salt, token, or session secret (p14).
- **SEC-004** Logout removes authenticated access. A protected endpoint called with the logged-out session afterwards fails (p14).
- **SEC-005** Role is read from the server-side session or re-resolved per request, never from a value the client stores or sends. Stale client-held role data is never trusted (p14).

## 2. Passwords

- **SEC-006** Passwords are never stored in plaintext, never logged, never returned, and never placed in a seed file as a real personal password (p11).
- **SEC-007** Hashing uses a deliberately slow algorithm with a unique per-password salt. Comparison hashes the attempt and checks against the stored hash (p11).
- **SEC-008** A user flagged as requiring a password change cannot reach any normal application endpoint or screen until a valid new password is saved (BR-02).
- **SEC-009** The password-change endpoint verifies the current password before accepting a new one, and validates the new one against the documented rules (p10).
- **SEC-010** Password rules — length and composition — are stated in `specification.md` and enforced on the server. The client may mirror them for feedback; it does not own them.
- **SEC-011** An initial password set by an Administrator is a bridge to a user-chosen password, never a durable credential. Setting one always sets `mustChangePassword` (p10).

## 3. Sessions

- **SEC-012** The session mechanism, its storage, its expiry, and its invalidation on logout are documented in `api-spec.md` before implementation.
- **SEC-013** Session cookies are `httpOnly`, `SameSite` at least `Lax`, and `Secure` wherever the transport allows it. Client JavaScript can never read the session.
- **SEC-014** Expiry is defined and enforced, not left to the default (p14).
- **SEC-015** Where a cookie session is used, the CSRF position is stated explicitly — what protects the app, and why it is sufficient for this deployment (p32).

## 4. Authorization

- **SEC-016** Every protected endpoint checks **authentication and authorization** before doing any work. The UI's hidden or disabled control is feedback, never a control (p22).
- **SEC-017** Authorization decides on all three of subject, action, and object — not on role alone (p19).
- **SEC-018** Object-level ownership is resolved from the **authenticated identity**. A `requesterId`, `userId`, or owner field supplied by the client is never trusted for an ownership decision (p23).
- **SEC-019** Requester-scoped queries filter by the authenticated user's id in the query itself, not by filtering results afterwards (p23).
- **SEC-020** The authorization matrix in `specification.md` lists every protected operation against every role. An operation absent from the matrix is denied, not permitted by default.
- **SEC-021** Internal Notes are readable and writable only by IT Staff and Administrator. A Requester's attempt is refused **without revealing whether any note exists** (BR-04, AC-04).
- **SEC-022** A Requester may indicate a problem appears resolved but can never set `Resolved` or `Closed`. The server rejects the transition regardless of what the client sends (BR-05).

## 5. Safe failures

- **SEC-023** Status codes are used consistently: **401** unauthenticated, **403** authenticated but forbidden, **400** invalid input, **404** missing, **409** conflict, **500** unexpected (p34).
- **SEC-024** For a protected resource belonging to someone else, the response does not confirm the resource exists. This continues Lab 2's §11.7 decision — 404 rather than 403 for another Requester's Ticket (p34).
- **SEC-025** No response body carries a stack trace, SQL fragment, ORM error, file path, or internal identifier of another user's data (p34).
- **SEC-026** Server logs record security-relevant failures — repeated failed logins, forbidden access, invalid session — with a correlation id, and never a password, hash, token, or secret (p17, p34).

## 6. Input and injection

- **SEC-027** All database access goes through Prisma's parameterised queries. No string-concatenated SQL, anywhere (p29–30).
- **SEC-028** Every input is validated server-side for type, range, length, and enum membership — including role names, status values, identifiers, and query parameters. Client validation never substitutes (p28).
- **SEC-029** User-authored content — Public Comments, Internal Notes, names — is rendered as text, never as HTML. React's default escaping is retained; `dangerouslySetInnerHTML` is not used (p31).
- **SEC-030** Empty and whitespace-only content is rejected, and documented length limits are enforced server-side.

## 7. Configuration and secrets

- **SEC-031** Secrets — database URL, session secret, hashing configuration — live in `.env`, which is never committed. Only `.env.example` is tracked, with placeholder values (p37).
- **SEC-032** No credential, session secret, or password appears in any committed file, any test fixture with a real value, any screenshot, or any log.
- **SEC-033** Seeded development credentials are clearly labelled as local-lab-only and documented in one place.

## 8. Administrator safety

- **SEC-034** An Administrator cannot deactivate their own account.
- **SEC-035** The system can never be left with zero active Administrators. The last one cannot be deactivated or demoted.
- **SEC-036** Duplicate email addresses are rejected with a conflict, and the rejection does not reveal the other account's details.
- **SEC-037** Only the roles named in the specification are assignable. An unknown or malformed role value is a validation failure, not a silent default.

## 9. Required security tests

Lecture 5 p38: *prove the boundary, not only the happy path.* Each of these is a required test family, not a suggestion. They belong in `tests.md` with identifiers and file paths.

| Family | Must include |
|---|---|
| **Authentication** | valid login · invalid password · unknown email · inactive account · first-login change required · logout blocks a subsequent protected call |
| **Authorization — role** | Requester calling an IT Staff endpoint · Requester calling an Administrator endpoint · IT Staff calling an Administrator endpoint · unauthenticated call to each protected endpoint |
| **Authorization — object** | Requester reading another Requester's Ticket · another Requester's Attachment · Requester reading Internal Notes · Requester attempting `Resolved`/`Closed` |
| **Failure shape** | duplicate email conflict · invalid role rejected · invalid status transition rejected · malformed query parameter · injection-shaped input handled safely |
| **Administrator safety** | self-deactivation refused · last-active-Administrator deactivation refused · non-Administrator refused |

**The rule that makes these meaningful:** each test calls the API **directly**, with the wrong role or the wrong identity, without going through the UI. A test that drives the interface proves the button is hidden. Only a direct call proves the boundary holds.

## 10. Audit procedure

Before requesting review on any Issue that touches authentication, authorization, or user data:

1. `grep -rniE "password|secret|token|hash" --include=*.ts --include=*.tsx server/src client/src` — every hit must be a variable name or a comment, never a literal value.
2. Confirm no committed file contains a real credential; `.env` and `.env.test` remain untracked.
3. For every endpoint added or changed, name the test that calls it as the wrong role. If there is none, the Issue is not done.
4. Confirm no response body in any test snapshot contains a hash, a session identifier, or another user's data.
5. Record any rule knowingly unmet, with its identifier and reason, in the PR description. An unmet rule that is disclosed is a decision; an unmet rule that is silent is a defect.
