# Review Format

Reviews are written to `.team/mrs/<MR-ID>/review-<round>.md`. The shape mirrors a GitHub pull request review (one verdict, one summary, line comments) so it can be posted with `gh` later without rework.

## Reviewer output

```markdown
---
mr: MR-003
round: 1
reviewer: sr-engineer
verdict: changes-requested   # approved | changes-requested
blocking: 2
nits: 1
red_before_green: confirmed  # confirmed | not-confirmed
---

## Summary
Two or three sentences: does this MR meet the acceptance criteria, and what is the main problem if not.

## Comments

### B1 · blocking · [S6] · src/api/listings.ts:42
`fetchListing` catches every error and returns `null`, so a 500 from the MLS looks like "not found" to the caller.
**Suggestion:** let non-404 errors throw; map only 404 to `null`.

### B2 · blocking · [AC2] · src/api/listings.ts:58-71
Acceptance criterion 2 says results are sorted by list date descending. They are sorted ascending.

### N1 · nit · [S15] · commit 4f2a1c9
Commit body restates the diff. One line is enough.
```

Rules:
- IDs: `B<n>` for blocking, `N<n>` for nits. Numbering restarts each round.
- Tag every comment with a rubric ID (`[S1]`–`[S17]`), an acceptance criterion (`[AC<n>]`), or `[BUG]`, `[SEC]`, `[PERF]`, `[TEST]`, `[ARCH]`, `[UI]`.
- Every comment points at a file and line range (or a commit). No location means no comment.
- Every blocking comment says what would resolve it.
- `verdict: approved` requires `blocking: 0`.
- No praise, no preamble, no "overall this looks great". If there is nothing to say, the comments section is empty.

## Principal second pass

When the Principal reviews after the Sr. has approved, the files are `principal-review-<round>.md` and `principal-response-<round>.md`, the frontmatter adds `pass: second`, and the same rules apply.

## Re-review (round 2+)

- Check each previous blocking comment: resolved, or the author's disagreement holds.
- Only raise new blocking comments on lines changed since the last round, or on a real bug you missed (tag it `[MISSED]` and say so plainly).
- If every previous blocking comment is resolved and nothing new qualifies, approve.

## Author response

Before re-review, the author writes `.team/mrs/<MR-ID>/response-<round>.md`:

```markdown
### B1 · fixed · 7c1e0b2
Non-404 errors now propagate.

### B2 · disagree
AC2 in PLAN-001 says "most recent first", which is what the code does; the reviewer read the test name. See tests/listings.test.ts:30.
```

Each blocking comment gets `fixed` (with commit) or `disagree` (with a reason grounded in the spec, code, or rubric). Nits may be ignored without comment.
