### B1 · fixed · 6837cb9
`isError` is now its own state field. Invalid input sets the message, `isError: true` and `conversion: null`, and changes `status` to `'error'` only when no run is in flight; otherwise the lookup stays `busy` and settles on its result. QA's e656a4f tests pass.

### N1 · fixed · 6837cb9
Added a why-comment on `lookupLink`: it resolves on every lookup failure with a null conversion, so callers need no rejection path. I chose the comment over a `.catch` because that catch would cover a path the code can't reach today.

### N2 · fixed · 6837cb9
`jsonp` builds `src` at the top of the executor, so a malformed URL throws before any timer or window callback exists.

### N3 · acknowledged
Next time I'll flag plan conflicts in notes.md and leave the plan change to the planner or the Principal.
