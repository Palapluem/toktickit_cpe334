# Testing Contract

**Version:** 1.0 — 25 August 2026

The Software Test Specification for this sprint: what must be proved, how tests are authored, and where the evidence comes from.

`tests.md` is the *plan and the results* — the enumerated tests and their traceability. This file is the *standard those tests are written to*. A test that violates this contract is rejected in review even when it passes.

---

## 1. Test Levels

The levels below map to the course taxonomy (Lecture 3; Lecture 4 slides 136–138). Lecture 4 also distinguishes per-feature from per-sprint scope, which determines when each level runs.

| Level | Proves | Tool | Scope (Lecture 4 slide 137) |
| :--- | :--- | :--- | :--- |
| Unit | One function or component in isolation; dependencies stubbed | Vitest | Per Issue |
| API integration | Handler + validation + Prisma + PostgreSQL together, over HTTP | Vitest + Supertest | Per Issue |
| UI component | A React component's rendering and behaviour, network mocked | Vitest + Testing Library | Per Issue |
| UI style | Rendered output uses the theme tokens the style contract requires | Vitest + Testing Library | Per Issue |
| Responsive | Screens render correctly at the three specified viewports | Playwright | Per sprint |
| E2E | A whole user journey through the running application | Playwright | Per sprint |
| Regression | The full suite, re-run after every change | all of the above | Continuous |

Regression is not a stage in the sequence. It is the standing requirement that a merge never reddens a test that was green.

## 2. Test Design Techniques

Every test exists because a technique selected it, not because it seemed worth writing. Name the technique in the header comment of the group it covers.

- **TDT-01 Equivalence partitioning** — for inputs with classes that behave identically. One representative per class; more adds runtime without adding information. *Applies to:* field validation, filter values, requester context.
- **TDT-02 Boundary-value analysis** — for every bounded input, test the value below the boundary, at it, and above it. *Applies to:* title and description length limits, attachment size and count limits, page size, page number.
- **TDT-03 Decision tables** — where several conditions combine into distinct outcomes, enumerate the combinations rather than testing conditions singly. *Applies to:* the search + filter + sort + pagination interaction on My Tickets; attachment state against requested action.
- **TDT-04 State transition** — for entities with a lifecycle, test the legal transitions and at least one illegal one. *Applies to:* attachment active to soft-removed, and the refusal to serve content afterwards.
- **TDT-05 Error guessing** — targeted tests for the failure modes this design invites: concurrent ticket-number allocation, cross-requester access by direct URL, requester switching mid-session, submitting twice.

## 3. Universal Requirements

Every feature satisfies these regardless of which Issue delivers it. Each has one test at minimum.

### A. Ownership and Access

- **TC-001** A ticket list returns only tickets belonging to the active requester.
- **TC-002** Requesting another requester's ticket by its identifier returns 404, not 403 — a 403 confirms the record exists while refusing it.
- **TC-003** Ownership is enforced in the request handler and proved by a test that calls the API directly, with the UI not involved.
- **TC-004** Switching the active requester changes the visible set immediately, with no data from the previous requester left rendered.

### B. Validation

- **TC-005** Each required field, when absent, produces a field-scoped error naming that field.
- **TC-006** Each bounded field is tested at, below, and above its boundary (TDT-02).
- **TC-007** A rejected request persists nothing. Verified by reading back, not by trusting the status code.
- **TC-008** Validation errors return the shared error envelope from `api-spec.md`, and never leak a stack trace, SQL fragment, or file path.

### C. Persistence

- **TC-009** A successful create is verified by reading the record back, not by asserting on the response body alone.
- **TC-010** Ticket Number is unique under concurrent creation. The test issues genuinely parallel requests; a sequential loop does not prove this.
- **TC-011** A multi-row write either completes entirely or leaves nothing behind.
- **TC-012** Server-owned values — identifier, ticket number, timestamps, status — are assigned by the server and ignored when supplied by the client.
- **TC-024** The Ticket Number year follows the `Asia/Bangkok` calendar (BR-04, §11.13). Tested with an injected fixed clock at 31 December 16:59 UTC and 17:00 UTC — the two sides of the Bangkok year boundary — never by waiting for a real date. `createdAt` remains UTC in the same assertion.

### D. Attachments

- **TC-013** Rejected file types and oversized files are refused with the specified status, and nothing is written to disk.
- **TC-014** Soft removal retains metadata and refuses content on subsequent requests (TDT-04).
- **TC-015** The attachment count limit is enforced at the boundary.
- **TC-022** A **rule violation** during Ticket creation — a file over the size limit or of a disallowed type — rejects the whole request and creates **no Ticket**. Verified by reading back and finding nothing, not by the status code alone.
- **TC-023** A **storage failure** during Ticket creation keeps the Ticket and reports the file in `attachmentFailures`. The stored-file adapter is stubbed to fail; a test that cannot induce this case is not testing it.

TC-022 and TC-023 are a matched pair (`specification.md` §11.14). An implementation that collapses the two classes passes whichever one is written alone, so neither may be omitted.

### E. List Behaviour

- **TC-016** Search, filter, sort, and pagination compose correctly when applied together (TDT-03).
- **TC-017** Invalid sort fields and out-of-range page sizes behave as `api-spec.md` specifies rather than by database default.
- **TC-018** Empty (no records exist) and no-results (filters match nothing) are distinguishable in the response.

### F. Style

- **TC-019** Rendered components carry the theme token classes the style contract requires (STY-001, STY-003).
- **TC-020** Priority and status are present as text, not colour alone (STY-019).
- **TC-021** Every input has an associated label (STY-026).

## 4. Authoring Standards

- **TCS-01** Every test cites the identifier it proves — `FR-`, `BR-`, `AC-`, `TC-`, or `STY-` — in its name or a header comment. A test that proves nothing nameable does not belong in the suite.
- **TCS-02** Tests are written from the acceptance criterion, never from the implementation. A test derived from the code proves only that the code does what it does.
- **TCS-03** Each test is independent: it seeds what it needs and cleans up after itself. Passing only in a particular order is a defect.
- **TCS-04** No skipped test, no focused test, and no commented-out test on a merged branch.
- **TCS-05** Assertions are specific. Asserting the status code alone is insufficient where the contract also specifies which field failed.
- **TCS-06** Test names describe the behaviour and its condition, not the mechanism.
- **TCS-07** Fixtures are shared; assertions are not. Duplicated setup moves to a fixture; duplicated assertions usually mean the test boundary is wrong.

## 5. Red-Phase Evidence

The convention for demonstrating Test-Driven Development in Part 3 of the submission. Applied to at least one test per implementation Issue, and to every test covering a mandatory business rule.

1. Commit the failing test on its own, with a message beginning `test:` and naming the acceptance criterion it derives from.
2. Run it and capture the failure output. The failure must be an assertion failure describing the missing behaviour — not an import error, not a compile error, not a configuration error. A test that fails for the wrong reason proves nothing about the code that will make it pass.
3. Commit the implementation separately, with a message beginning `feat:` or `fix:`.
4. Re-run and capture the pass.

Those two commits in that order, plus the two captures, are the red-green evidence. The commit history carries the proof; the captures make it legible to the reader.

### When the module does not exist yet

A test importing a module that has not been written fails with `Cannot find module`. That is an import error, and step 2 rejects it: it proves the test could not run, not that the behaviour is missing.

The seam is therefore created in the **same commit as the tests**, as a stub whose functions return a neutral value — an empty string, a zero, an empty array — and implement nothing. The tests then fail on assertions that name the missing behaviour (`expected '' to be 'TKT-2026-000001'`), which is what the evidence has to show.

A stub is not implementation. It fixes the module's *shape* — its path, its exported names, its signatures — which is a design decision worth making before the behaviour and worth reviewing separately from it. What it must not do is contain any logic the tests are meant to drive out. If a stub returns something a test accepts, the stub is too clever and the test is too weak.

The `feat:` commit then replaces the stub body, and the diff shows exactly the behaviour the tests demanded.

## 6. Completion Gate

An Issue is complete only when:

- Every applicable `TC-###` in §3 is green, or explicitly recorded as not applicable with its reason
- Every acceptance criterion in its scope has at least one green test
- Red-phase evidence exists for at least one test in the Issue
- The full suite passes, not only the tests added by this Issue
- `tests.md` is updated with the result rows
