# Slop Rubric

Every reviewer checks every MR against this list. Each item is **blocking** unless marked *nit*. A reviewer may not downgrade a blocking item to a nit. In particular, [S14] and [S17] are always blocking, whatever the plan listed and however few callers there are today.
Cite the rubric ID in review comments (e.g. `[S3]`) so the dashboard can count findings.

If the `ponytail-review` or `pragmatic-programmer` skills are available, apply them too. This file wins on conflict.

| ID  | Slop pattern | What to ask for instead |
|-----|--------------|-------------------------|
| S1  | Comments that narrate the code (`// increment i`, `// call the API`) | Delete. Comment only *why*: constraints, trade-offs, links to bugs/specs. |
| S2  | Speculative abstraction: interface/base class/factory/strategy with one implementation; config options nobody asked for | Inline it. Abstract on the second real use, not the first. |
| S3  | Defensive checks for states that cannot occur (re-validating already-typed input, null checks on non-nullable values) | Validate once at the boundary; trust types inside. |
| S4  | Reinventing the standard library or platform (hand-rolled debounce, deep clone, date math, retry loops) | Use the stdlib / platform API / existing dependency. |
| S5  | New dependency for something small | Justify in the MR description or remove. |
| S6  | Swallowed errors: empty `catch`, log-and-continue, returning `null` to hide failure | Let it propagate, or handle it with a specific recovery. |
| S7  | Generic names: `data`, `info`, `result`, `item`, `handler`, `manager`, `helper`, `utils`, `process()` | Name it after what it is in the domain. |
| S8  | Tests that assert on mocks, test implementation details, or just restate the code | Test observable behavior through the public interface. |
| S9  | Dead code: unused exports/params/vars, commented-out code, leftover TODOs without a ticket | Delete. |
| S10 | Wrapper functions that only forward arguments | Call the underlying function. |
| S11 | Over-long functions or files doing several jobs | Split on responsibility, not on line count. |
| S12 | Inconsistency with existing codebase patterns (new style for errors, fetching, state, folder layout) | Follow the existing pattern, or the Principal approves the new one. |
| S13 | Scope creep: changes unrelated to the task (drive-by refactors, reformatting untouched files) | Revert; open a separate task. |
| S14 | Any literal value inline instead of in the constants file (`paths.constants`): user-facing text, numbers, regexes, keys, routes, URLs (only `0`, `1`, `""`, booleans, `null` are exempt) | Move it to the constants file and import it. |
| S17 | Duplicated logic, or new code that re-implements something already in the codebase; reusable logic (validation, formatting, parsing, generic UI) buried inside a feature module | Reuse the existing code, or extract to `paths.shared`. |
| S15 | *nit* — Over-explaining commit messages or MR descriptions; marketing tone; emoji | One-line subject, short body stating what and why. |
| S16 | *nit* — Formatting the formatter should own | Run the formatter. |

## Not slop

Don't flag these as blocking:
- A style preference with no rubric ID and no correctness impact — leave it as a *nit* or say nothing.
- Code that was not changed in this MR.
- Missing features that were not in the acceptance criteria.
