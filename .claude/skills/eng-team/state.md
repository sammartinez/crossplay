# .team/data.js

The dashboard loads this file with a `<script>` tag (so it works from `file://` with no server). It must be valid JavaScript that assigns one object to `window.TEAM`. Rewrite the whole file on every update; don't append.

## Empty state (write on setup)

```js
window.TEAM = {
  "project": "<repo directory name>",
  "updated": "<ISO timestamp>",
  "plans": [],
  "mrs": [],
  "events": []
};
```

## Shape

```js
window.TEAM = {
  "project": "lead-engine",
  "updated": "2026-10-22T16:40:00Z",
  "plans": [
    { "id": "PLAN-001", "title": "Saved searches", "status": "in-progress",
      "created": "2026-10-22T15:02:00Z", "approved": "2026-10-22T15:10:00Z",
      "screens": [] }   // final screenshots of the integrated result
  ],
  "mrs": [
    {
      "id": "MR-003",
      "plan": "PLAN-001",            // null on the small-change path
      "title": "Sort listings by list date",
      "branch": "mr/003-sort-listings",
      "size": "standard",            // standard | small
      "complexity": "low",           // low | medium | high
      "author": "engineer",          // engineer | sr-engineer | principal
      "reviewer": "sr-engineer",     // first reviewer: sr-engineer | principal (null until review)
      "second_reviewer": "principal",// set when a Principal second pass is required, else null
      "sets_pattern": true,
      "stage": "first",              // first | second | done — which review pass is current
      "second_round": 0,             // Principal second-pass round (0 until it starts)
      "routing": null,               // e.g. "sr busy with MR-004"
      "status": "in-review",
      "round": 1,                    // current review round (0 before first review)
      "gate_attempts": 1,
      "blocking": 2,                 // open blocking comments from the latest review
      "nits": 1,
      "findings": { "S6": 1, "AC2": 1, "S15": 1 },   // cumulative tag counts across all rounds
      "screens": ["mrs/MR-003/screens/home.png"],   // UI screenshots, relative to .team/
      "needs_user": false,           // true for Principal-authored MRs and escalations
      "opened": "2026-10-22T15:12:00Z",
      "updated": "2026-10-22T16:40:00Z"
    }
  ],
  "events": [
    // newest last; keep the most recent 300
    { "at": "2026-10-22T16:40:00Z", "mr": "MR-003", "actor": "sr-engineer",
      "type": "review", "note": "changes requested: 2 blocking, 1 nit" }
  ]
};
```

## Status values

Plans: `awaiting-approval` → `in-progress` → `done` (or `rejected`).

MRs: `queued` → `tests` → `implementing` → `in-review` ⇄ `changes-requested` → `approved` → `merged`, plus `escalated` from any of the review states.

## Event types

`plan-drafted`, `plan-approved`, `tests-written`, `red-confirmed`, `implemented`, `gates-failed`, `gates-passed`, `review`, `response`, `second-review`, `escalated`, `settled`, `approved`, `merged`, `plan-done`.

`actor` is the role that did it (`principal`, `sr-engineer`, `engineer`, `qa`, `orchestrator`, `user`). `note` is one short line.
