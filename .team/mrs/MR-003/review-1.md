---
mr: MR-003
round: 1
reviewer: principal
verdict: changes-requested
blocking: 1
nits: 3
red_before_green: confirmed
---

## Summary
The network layer meets AC9. `lookupLink` follows the reference order and catches failures in the same places. `jsonp` cleans up on every path. Returning the resolved `parsed` cleanly replaces the old `Object.assign` mutation. The T2 edits are the MR-002 principal notes being applied, so they are in scope, and gates.md confirms red-before-green: QA's b37785f fails on the missing modules, it is green now, and QA's files are unchanged. The one blocking problem is in the async-state shape this MR sets for T4. Invalid input sent while a lookup is running overwrites `status` with `'error'`, so the hook stops reporting a lookup that is still in flight. The reference keeps it busy in that case. The AC10 rewording in the working tree is accepted (N3).

## Comments

### B1 · blocking · [BUG] · src/hooks/useConversion.ts:44-48, 69
If input that doesn't parse arrives while a lookup is in flight, `setState(failed(INVALID_LINK_MESSAGE))` sets `status` to `'error'`. The run carries on: `busyLink` stays set and its result still lands later. In the reference (`show(msg, true)`, lines 196 and 216), the error text and the `busy` class are independent. The invalid-link message shows while `main.busy` and the disabled Convert button stay on until the lookup finishes. Here, T4 will derive `busy` from `status`, so for the rest of the lookup the button comes back on and the crossfader stops. If the user then presses Convert on the in-flight link, the `busyLink` guard drops it silently while the UI shows no lookup running. The interface already has a separate `isError`. Deriving it from `status` throws away the one state the reference actually has: busy with an error message showing. notes.md says this matches the reference. It does for the data, but not for the busy state.
**Suggestion:** keep `isError` as its own state field. On invalid input, set `message`, `isError: true` and `conversion: null`, but leave `status` alone while a run is in flight (`latest.current.busyLink !== null`). Set `status: 'error'` only when nothing is running. Ask QA for a test where invalid input arrives during a pending lookup: the hook should stay `busy` with `isError: true` and the invalid-link message, then settle on the lookup's result.

### N1 · nit · [ARCH] · src/hooks/useConversion.ts:52-62
`lookupLink(parsed).then(...)` has no rejection path. Today that's safe, because `lookupLink` effectively never rejects (`viaOdesliOrSource` catches everything, the Spotify branch catches everything, and iTunes goes through `itunesOrNothing`). But nothing in the type or the code states that contract. If it ever rejects, `busyLink` stays set for good, and every later `convert` of that link is dropped. This hook is the pattern T4 and T5 will copy, so make the contract explicit. Either add a `.catch` that applies `failed(failureMessage(parsed))` under the same `runId` guard, or put a one-line *why* comment on `lookupLink` saying it resolves on every failure.

### N2 · nit · [BUG] · src/lib/api.ts:43-56
`new URL(url)` runs after the timer is armed and the window callback is registered. If the URL is malformed, the promise rejects but the global callback and the timer stay around until the 8 s timeout fires. Build `src` first, at the top of the executor, so a throw leaves nothing behind.

### N3 · nit · [AC10] · .team/plans/PLAN-001.md:60
The rewording is accepted. It resolves a contradiction inside the plan in favour of the T3 interface (`conversion`, `isError`, `chooseAlt`), which AC12, QA's tests and this implementation were all built against, and it changes none of AC10's behavior rules. For next time: engineering.md says to stop and report when a task is wrong. The author should not edit an approved plan, so flag the conflict in notes.md and leave the plan change to the planner or the Principal.
