window.TEAM = {
  "project": "crossplay",
  "updated": "2026-10-24T02:14:13Z",
  "plans": [
    {
      "id": "PLAN-001",
      "title": "React rewrite",
      "status": "in-progress",
      "created": "2026-10-24T00:22:14Z",
      "approved": "2026-10-24T00:48:26Z",
      "screens": [
        "plans/PLAN-001/screens/home-light.png",
        "plans/PLAN-001/screens/home-dark.png",
        "plans/PLAN-001/screens/result-light.png",
        "plans/PLAN-001/screens/result-dark.png",
        "plans/PLAN-001/screens/invalid-light.png",
        "plans/PLAN-001/screens/invalid-dark.png"
      ]
    }
  ],
  "mrs": [
    {
      "id": "MR-001",
      "plan": "PLAN-001",
      "task": "T1",
      "title": "Vite + React + TS scaffold, harness, theme toggle",
      "branch": "mr/001-scaffold",
      "size": "standard",
      "complexity": "high",
      "author": "principal",
      "reviewer": "sr-engineer",
      "second_reviewer": null,
      "sets_pattern": true,
      "stage": "done",
      "second_round": 0,
      "routing": null,
      "status": "merged",
      "round": 1,
      "gate_attempts": 1,
      "blocking": 0,
      "nits": 3,
      "findings": {
        "TEST": 1,
        "BUG": 1,
        "ARCH": 1
      },
      "screens": [
        "mrs/MR-001/screens/home-light.png",
        "mrs/MR-001/screens/home-dark.png"
      ],
      "needs_user": true,
      "opened": "2026-10-24T00:48:26Z",
      "updated": "2026-10-24T00:58:32Z"
    },
    {
      "id": "MR-002",
      "plan": "PLAN-001",
      "task": "T2",
      "title": "Pure link, share and response-mapping modules",
      "branch": "mr/002-pure-modules",
      "size": "standard",
      "complexity": "medium",
      "author": "engineer",
      "reviewer": "sr-engineer",
      "second_reviewer": "principal",
      "sets_pattern": true,
      "stage": "done",
      "second_round": 1,
      "routing": null,
      "status": "merged",
      "round": 2,
      "gate_attempts": 1,
      "blocking": 0,
      "nits": 3,
      "findings": {
        "S14": 1,
        "BUG": 1,
        "ARCH": 3
      },
      "screens": [],
      "needs_user": false,
      "opened": "2026-10-24T00:48:26Z",
      "updated": "2026-10-24T01:12:45Z"
    },
    {
      "id": "MR-003",
      "plan": "PLAN-001",
      "task": "T3",
      "title": "Network layer and useConversion hook",
      "branch": "mr/003-network-hook",
      "size": "standard",
      "complexity": "high",
      "author": "sr-engineer",
      "reviewer": "principal",
      "second_reviewer": null,
      "sets_pattern": true,
      "stage": "done",
      "second_round": 0,
      "routing": null,
      "status": "merged",
      "round": 2,
      "gate_attempts": 1,
      "blocking": 0,
      "nits": 0,
      "findings": {
        "BUG": 2,
        "ARCH": 1,
        "AC10": 1
      },
      "screens": [],
      "needs_user": false,
      "opened": "2026-10-24T00:48:26Z",
      "updated": "2026-10-24T01:26:52Z"
    },
    {
      "id": "MR-004",
      "plan": "PLAN-001",
      "task": "T4",
      "title": "Convert form, result card, alternates, ?u= auto-convert",
      "branch": "mr/004-convert-ui",
      "size": "standard",
      "complexity": "medium",
      "author": "engineer",
      "reviewer": "sr-engineer",
      "second_reviewer": "principal",
      "sets_pattern": false,
      "stage": "done",
      "second_round": 2,
      "routing": null,
      "status": "merged",
      "round": 3,
      "gate_attempts": 1,
      "blocking": 0,
      "nits": 0,
      "findings": {
        "TEST": 1,
        "BUG": 1,
        "UI": 1,
        "S8": 1,
        "S17": 2,
        "MISSED": 1,
        "ARCH": 1
      },
      "screens": [
        "mrs/MR-004/screens/home-light.png",
        "mrs/MR-004/screens/home-dark.png",
        "mrs/MR-004/screens/result-light.png",
        "mrs/MR-004/screens/result-dark.png",
        "mrs/MR-004/screens/invalid-light.png",
        "mrs/MR-004/screens/invalid-dark.png"
      ],
      "needs_user": false,
      "opened": "2026-10-24T00:48:26Z",
      "updated": "2026-10-24T01:45:54Z"
    },
    {
      "id": "MR-005",
      "plan": "PLAN-001",
      "task": "T5",
      "title": "Copy buttons, share text, clipboard fallback",
      "branch": "mr/005-copy-share",
      "size": "standard",
      "complexity": "medium",
      "author": "engineer",
      "reviewer": "sr-engineer",
      "second_reviewer": "principal",
      "sets_pattern": false,
      "stage": "done",
      "second_round": 1,
      "routing": null,
      "status": "merged",
      "round": 2,
      "gate_attempts": 1,
      "blocking": 0,
      "nits": 1,
      "findings": {
        "S17": 1,
        "TEST": 2,
        "UI": 1
      },
      "screens": [
        "mrs/MR-005/screens/result-light.png",
        "mrs/MR-005/screens/result-dark.png"
      ],
      "needs_user": false,
      "opened": "2026-10-24T00:48:26Z",
      "updated": "2026-10-24T01:58:33Z"
    },
    {
      "id": "MR-006",
      "plan": "PLAN-001",
      "task": "T6",
      "title": "GitHub Pages build-and-deploy workflow and README",
      "branch": "mr/006-deploy",
      "size": "standard",
      "complexity": "low",
      "author": "engineer",
      "reviewer": "sr-engineer",
      "second_reviewer": "principal",
      "sets_pattern": true,
      "stage": "done",
      "second_round": 1,
      "routing": null,
      "status": "merged",
      "round": 1,
      "gate_attempts": 1,
      "blocking": 0,
      "nits": 3,
      "findings": {
        "AC9": 1,
        "SEC": 1,
        "ARCH": 1,
        "S2": 1
      },
      "screens": [],
      "needs_user": false,
      "opened": "2026-10-24T00:48:26Z",
      "updated": "2026-10-24T02:05:05Z"
    }
  ],
  "events": [
    {
      "at": "2026-10-24T00:22:14Z",
      "mr": null,
      "actor": "principal",
      "type": "plan-drafted",
      "note": "PLAN-001: 13 ACs, 3 tasks"
    },
    {
      "at": "2026-10-24T00:27:16Z",
      "mr": null,
      "actor": "principal",
      "type": "plan-drafted",
      "note": "PLAN-001 revised: React + TS rewrite, 16 ACs, 6 tasks"
    },
    {
      "at": "2026-10-24T00:48:26Z",
      "mr": null,
      "actor": "user",
      "type": "plan-approved",
      "note": "PLAN-001 approved; 6 MRs queued"
    },
    {
      "at": "2026-10-24T00:48:47Z",
      "mr": "MR-001",
      "actor": "orchestrator",
      "type": "tests-written",
      "note": "QA started on MR-001"
    },
    {
      "at": "2026-10-24T00:52:14Z",
      "mr": "MR-001",
      "actor": "qa",
      "type": "red-confirmed",
      "note": "36 tests, red (harness absent)"
    },
    {
      "at": "2026-10-24T00:56:36Z",
      "mr": "MR-001",
      "actor": "orchestrator",
      "type": "gates-passed",
      "note": "test/lint/typecheck/build green; screenshots captured"
    },
    {
      "at": "2026-10-24T00:58:32Z",
      "mr": "MR-001",
      "actor": "sr-engineer",
      "type": "review",
      "note": "approved: 0 blocking, 3 nits"
    },
    {
      "at": "2026-10-24T00:58:32Z",
      "mr": "MR-001",
      "actor": "orchestrator",
      "type": "merged",
      "note": "merged into team/PLAN-001"
    },
    {
      "at": "2026-10-24T00:58:32Z",
      "mr": "MR-002",
      "actor": "orchestrator",
      "type": "tests-written",
      "note": "QA started on MR-002"
    },
    {
      "at": "2026-10-24T01:03:43Z",
      "mr": "MR-002",
      "actor": "qa",
      "type": "red-confirmed",
      "note": "~78 new tests red; existing 36 green"
    },
    {
      "at": "2026-10-24T01:07:21Z",
      "mr": "MR-002",
      "actor": "orchestrator",
      "type": "gates-passed",
      "note": "114/114, lint, typecheck green"
    },
    {
      "at": "2026-10-24T01:09:00Z",
      "mr": "MR-002",
      "actor": "sr-engineer",
      "type": "review",
      "note": "changes requested: 1 blocking, 1 nit"
    },
    {
      "at": "2026-10-24T01:10:28Z",
      "mr": "MR-002",
      "actor": "engineer",
      "type": "response",
      "note": "B1 fixed (bae9967); N1 kept"
    },
    {
      "at": "2026-10-24T01:10:56Z",
      "mr": "MR-002",
      "actor": "sr-engineer",
      "type": "review",
      "note": "round 2 approved; Principal second pass next"
    },
    {
      "at": "2026-10-24T01:12:44Z",
      "mr": "MR-002",
      "actor": "principal",
      "type": "second-review",
      "note": "approved: 0 blocking, 3 nits"
    },
    {
      "at": "2026-10-24T01:12:45Z",
      "mr": "MR-002",
      "actor": "orchestrator",
      "type": "merged",
      "note": "merged into team/PLAN-001"
    },
    {
      "at": "2026-10-24T01:12:45Z",
      "mr": "MR-003",
      "actor": "orchestrator",
      "type": "tests-written",
      "note": "QA started on MR-003"
    },
    {
      "at": "2026-10-24T01:17:34Z",
      "mr": "MR-003",
      "actor": "qa",
      "type": "red-confirmed",
      "note": "51 new tests red; existing 114 green"
    },
    {
      "at": "2026-10-24T01:21:23Z",
      "mr": "MR-003",
      "actor": "orchestrator",
      "type": "gates-passed",
      "note": "165/165, lint, typecheck, build green"
    },
    {
      "at": "2026-10-24T01:23:59Z",
      "mr": "MR-003",
      "actor": "principal",
      "type": "review",
      "note": "changes requested: 1 blocking, 3 nits"
    },
    {
      "at": "2026-10-24T01:26:24Z",
      "mr": "MR-003",
      "actor": "sr-engineer",
      "type": "response",
      "note": "B1, N1, N2 fixed (6837cb9)"
    },
    {
      "at": "2026-10-24T01:26:52Z",
      "mr": "MR-003",
      "actor": "principal",
      "type": "approved",
      "note": "round 2 approved"
    },
    {
      "at": "2026-10-24T01:26:52Z",
      "mr": "MR-003",
      "actor": "orchestrator",
      "type": "merged",
      "note": "merged into team/PLAN-001"
    },
    {
      "at": "2026-10-24T01:26:53Z",
      "mr": "MR-004",
      "actor": "orchestrator",
      "type": "tests-written",
      "note": "QA started on MR-004"
    },
    {
      "at": "2026-10-24T01:31:14Z",
      "mr": "MR-004",
      "actor": "qa",
      "type": "red-confirmed",
      "note": "44 new tests red; existing 167 green"
    },
    {
      "at": "2026-10-24T01:35:58Z",
      "mr": "MR-004",
      "actor": "orchestrator",
      "type": "gates-passed",
      "note": "257/257, lint, typecheck, build green; screenshots"
    },
    {
      "at": "2026-10-24T01:38:29Z",
      "mr": "MR-004",
      "actor": "sr-engineer",
      "type": "review",
      "note": "changes requested: 1 blocking, 3 nits"
    },
    {
      "at": "2026-10-24T01:40:37Z",
      "mr": "MR-004",
      "actor": "engineer",
      "type": "response",
      "note": "N1 fixed (4f1231d); B1/N3 by QA (2a6650e); N2 deferred"
    },
    {
      "at": "2026-10-24T01:41:26Z",
      "mr": "MR-004",
      "actor": "sr-engineer",
      "type": "review",
      "note": "round 2: 1 blocking (duplicated test helper)"
    },
    {
      "at": "2026-10-24T01:42:16Z",
      "mr": "MR-004",
      "actor": "qa",
      "type": "response",
      "note": "helper deduped into src/test/dom.ts (1a7a0c0)"
    },
    {
      "at": "2026-10-24T01:42:48Z",
      "mr": "MR-004",
      "actor": "sr-engineer",
      "type": "review",
      "note": "round 3 approved; Principal second pass next"
    },
    {
      "at": "2026-10-24T01:44:27Z",
      "mr": "MR-004",
      "actor": "principal",
      "type": "second-review",
      "note": "changes requested: duplicated row() test helper"
    },
    {
      "at": "2026-10-24T01:45:34Z",
      "mr": "MR-004",
      "actor": "qa",
      "type": "response",
      "note": "row helper shared (54ea5a9)"
    },
    {
      "at": "2026-10-24T01:45:54Z",
      "mr": "MR-004",
      "actor": "principal",
      "type": "second-review",
      "note": "approved"
    },
    {
      "at": "2026-10-24T01:45:54Z",
      "mr": "MR-004",
      "actor": "orchestrator",
      "type": "merged",
      "note": "merged into team/PLAN-001"
    },
    {
      "at": "2026-10-24T01:45:54Z",
      "mr": "MR-005",
      "actor": "orchestrator",
      "type": "tests-written",
      "note": "QA started on MR-005"
    },
    {
      "at": "2026-10-24T01:50:58Z",
      "mr": "MR-005",
      "actor": "qa",
      "type": "red-confirmed",
      "note": "28 new failing; 281 existing green"
    },
    {
      "at": "2026-10-24T01:53:45Z",
      "mr": "MR-005",
      "actor": "orchestrator",
      "type": "gates-passed",
      "note": "340/340, lint, typecheck, build green"
    },
    {
      "at": "2026-10-24T01:55:24Z",
      "mr": "MR-005",
      "actor": "sr-engineer",
      "type": "review",
      "note": "changes requested: duplicated selectedText test helper"
    },
    {
      "at": "2026-10-24T01:56:50Z",
      "mr": "MR-005",
      "actor": "qa",
      "type": "response",
      "note": "test helpers consolidated (fe3fb78)"
    },
    {
      "at": "2026-10-24T01:57:17Z",
      "mr": "MR-005",
      "actor": "sr-engineer",
      "type": "review",
      "note": "round 2 approved; Principal second pass next"
    },
    {
      "at": "2026-10-24T01:58:33Z",
      "mr": "MR-005",
      "actor": "principal",
      "type": "second-review",
      "note": "approved: 0 blocking, 1 nit"
    },
    {
      "at": "2026-10-24T01:58:33Z",
      "mr": "MR-005",
      "actor": "orchestrator",
      "type": "merged",
      "note": "merged into team/PLAN-001"
    },
    {
      "at": "2026-10-24T01:58:45Z",
      "mr": "MR-006",
      "actor": "orchestrator",
      "type": "tests-written",
      "note": "QA started on MR-006"
    },
    {
      "at": "2026-10-24T02:00:58Z",
      "mr": "MR-006",
      "actor": "qa",
      "type": "red-confirmed",
      "note": "25 new failing; existing green"
    },
    {
      "at": "2026-10-24T02:03:13Z",
      "mr": "MR-006",
      "actor": "orchestrator",
      "type": "gates-passed",
      "note": "370/370; dist URLs under /crossplay/"
    },
    {
      "at": "2026-10-24T02:04:09Z",
      "mr": "MR-006",
      "actor": "sr-engineer",
      "type": "review",
      "note": "approved; Principal second pass next"
    },
    {
      "at": "2026-10-24T02:05:05Z",
      "mr": "MR-006",
      "actor": "principal",
      "type": "second-review",
      "note": "approved: 0 blocking, 3 nits"
    },
    {
      "at": "2026-10-24T02:05:05Z",
      "mr": "MR-006",
      "actor": "orchestrator",
      "type": "merged",
      "note": "merged into team/PLAN-001"
    },
    {
      "at": "2026-10-24T02:14:13Z",
      "mr": null,
      "actor": "user",
      "type": "staged",
      "note": "PLAN-001 result staged on branch staged"
    }
  ]
};
