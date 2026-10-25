window.TEAM = {
  "project": "crossplay",
  "updated": "2026-10-25T23:24:36Z",
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
    },
    {
      "id": "PLAN-002",
      "title": "Spotify artist fix + tests layout",
      "status": "done",
      "created": "2026-10-24T02:57:03Z",
      "approved": "2026-10-24T02:57:03Z",
      "screens": [
        "plans/PLAN-002/screens/fallback-light.png",
        "plans/PLAN-002/screens/fallback-dark.png",
        "plans/PLAN-002/screens/picked-light.png",
        "plans/PLAN-002/screens/picked-dark.png"
      ]
    },
    {
      "id": "PLAN-003",
      "title": "Apple links: exact Spotify via Odesli hop + app search link",
      "status": "done",
      "created": "2026-10-24T15:25:01Z",
      "approved": "2026-10-24T15:25:01Z",
      "screens": [
        "plans/PLAN-003/screens/spotify-search-light.png",
        "plans/PLAN-003/screens/spotify-search-dark.png",
        "plans/PLAN-003/screens/spotify-exact-light.png",
        "plans/PLAN-003/screens/spotify-exact-dark.png"
      ]
    },
    {
      "id": "PLAN-004",
      "title": "Remove Odesli; title cleaning + LIKELY auto-pick",
      "status": "done",
      "created": "2026-10-24T16:37:23Z",
      "approved": "2026-10-24T16:37:23Z",
      "screens": [
        "plans/PLAN-004/screens/likely-light.png",
        "plans/PLAN-004/screens/likely-dark.png",
        "plans/PLAN-004/screens/picker-light.png",
        "plans/PLAN-004/screens/picker-dark.png"
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
    },
    {
      "plan": "PLAN-002",
      "size": "standard",
      "reviewer": "sr-engineer",
      "stage": "done",
      "second_round": 1,
      "routing": null,
      "round": 1,
      "gate_attempts": 1,
      "blocking": 0,
      "nits": 1,
      "findings": {
        "TEST": 1
      },
      "screens": [],
      "needs_user": false,
      "opened": "2026-10-24T02:57:03Z",
      "updated": "2026-10-24T14:19:14Z",
      "id": "MR-007",
      "task": "T1",
      "title": "Move tests under tests/ mirroring src",
      "branch": "mr/007-tests-layout",
      "complexity": "low",
      "author": "engineer",
      "second_reviewer": "principal",
      "sets_pattern": true,
      "status": "merged"
    },
    {
      "plan": "PLAN-002",
      "size": "standard",
      "reviewer": "principal",
      "stage": "done",
      "second_round": 0,
      "routing": null,
      "round": 2,
      "gate_attempts": 2,
      "blocking": 0,
      "nits": 1,
      "findings": {
        "TEST": 1,
        "ARCH": 1
      },
      "screens": [
        "mrs/MR-008/screens/fallback-light.png",
        "mrs/MR-008/screens/fallback-dark.png",
        "mrs/MR-008/screens/picked-light.png",
        "mrs/MR-008/screens/picked-dark.png"
      ],
      "needs_user": false,
      "opened": "2026-10-24T02:57:03Z",
      "updated": "2026-10-24T14:30:30Z",
      "id": "MR-008",
      "task": "T2",
      "title": "Odesli retry; honest Spotify fallback with artist picker",
      "branch": "mr/008-artist-picker",
      "complexity": "medium",
      "author": "sr-engineer",
      "second_reviewer": null,
      "sets_pattern": false,
      "status": "merged"
    },
    {
      "plan": "PLAN-003",
      "size": "standard",
      "reviewer": "sr-engineer",
      "stage": "done",
      "second_round": 1,
      "routing": null,
      "round": 2,
      "gate_attempts": 2,
      "blocking": 0,
      "nits": 4,
      "findings": {
        "BUG": 1,
        "AC9": 1,
        "S18": 1,
        "ARCH": 1,
        "S12": 1,
        "PERF": 1
      },
      "screens": [],
      "needs_user": false,
      "opened": "2026-10-24T15:25:01Z",
      "updated": "2026-10-24T15:43:18Z",
      "author": "engineer",
      "second_reviewer": "principal",
      "id": "MR-009",
      "task": "T1",
      "title": "One Odesli hop to fill missing platform links",
      "branch": "mr/009-odesli-hop",
      "complexity": "medium",
      "sets_pattern": false,
      "status": "merged"
    },
    {
      "plan": "PLAN-003",
      "size": "standard",
      "reviewer": "sr-engineer",
      "stage": "done",
      "second_round": 1,
      "routing": null,
      "round": 1,
      "gate_attempts": 2,
      "blocking": 0,
      "nits": 2,
      "findings": {
        "UI": 1,
        "ARCH": 1
      },
      "screens": [
        "mrs/MR-010/screens/spotify-search-light.png",
        "mrs/MR-010/screens/spotify-search-dark.png",
        "mrs/MR-010/screens/spotify-exact-light.png",
        "mrs/MR-010/screens/spotify-exact-dark.png"
      ],
      "needs_user": false,
      "opened": "2026-10-24T15:25:01Z",
      "updated": "2026-10-24T15:50:20Z",
      "author": "engineer",
      "second_reviewer": "principal",
      "id": "MR-010",
      "task": "T2",
      "title": "Search in Spotify app link",
      "branch": "mr/010-spotify-app-search",
      "complexity": "low",
      "sets_pattern": true,
      "status": "merged"
    },
    {
      "plan": "PLAN-004",
      "size": "standard",
      "reviewer": "sr-engineer",
      "stage": "done",
      "second_round": 2,
      "routing": null,
      "round": 1,
      "gate_attempts": 1,
      "blocking": 0,
      "nits": 6,
      "findings": {
        "TEST": 3,
        "AC10": 1,
        "MISSED": 1,
        "S9": 1,
        "ARCH": 1,
        "S1": 1
      },
      "screens": [],
      "needs_user": false,
      "opened": "2026-10-24T16:37:23Z",
      "updated": "2026-10-24T16:51:00Z",
      "author": "engineer",
      "second_reviewer": "principal",
      "complexity": "medium",
      "id": "MR-011",
      "task": "T1",
      "title": "Remove Odesli; lookups go straight to oEmbed/iTunes",
      "branch": "mr/011-remove-odesli",
      "sets_pattern": false,
      "status": "merged"
    },
    {
      "plan": "PLAN-004",
      "size": "standard",
      "reviewer": "sr-engineer",
      "stage": "done",
      "second_round": 2,
      "routing": null,
      "round": 1,
      "gate_attempts": 2,
      "blocking": 0,
      "nits": 6,
      "findings": {
        "UI": 4,
        "BUG": 1,
        "ARCH": 1
      },
      "screens": [
        "mrs/MR-012/screens/likely-light.png",
        "mrs/MR-012/screens/likely-dark.png",
        "mrs/MR-012/screens/picker-light.png",
        "mrs/MR-012/screens/picker-dark.png"
      ],
      "needs_user": false,
      "opened": "2026-10-24T16:37:23Z",
      "updated": "2026-10-25T23:15:48Z",
      "author": "engineer",
      "second_reviewer": "principal",
      "complexity": "medium",
      "id": "MR-012",
      "task": "T2",
      "title": "Title cleaning + LIKELY auto-pick",
      "branch": "mr/012-likely-autopick",
      "sets_pattern": true,
      "status": "merged"
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
    },
    {
      "at": "2026-10-24T02:57:03Z",
      "mr": "MR-007",
      "actor": "orchestrator",
      "type": "status",
      "note": "plan approved; QA writing tests"
    },
    {
      "at": "2026-10-24T02:59:28Z",
      "mr": "MR-007",
      "actor": "qa",
      "type": "tests",
      "note": "layout tests red (setup path); 39 files moved"
    },
    {
      "at": "2026-10-24T03:00:16Z",
      "mr": "MR-007",
      "actor": "orchestrator",
      "type": "gates",
      "note": "green: 392 tests"
    },
    {
      "at": "2026-10-24T14:18:17Z",
      "mr": "MR-007",
      "actor": "sr-engineer",
      "type": "review",
      "note": "approved: 0 blocking, 0 nits"
    },
    {
      "at": "2026-10-24T14:18:17Z",
      "mr": "MR-007",
      "actor": "orchestrator",
      "type": "status",
      "note": "principal second review"
    },
    {
      "at": "2026-10-24T14:19:14Z",
      "mr": "MR-007",
      "actor": "principal",
      "type": "review",
      "note": "second pass approved: 1 nit"
    },
    {
      "at": "2026-10-24T14:19:14Z",
      "mr": "MR-007",
      "actor": "orchestrator",
      "type": "merge",
      "note": "merged into team/PLAN-002"
    },
    {
      "at": "2026-10-24T14:19:14Z",
      "mr": "MR-008",
      "actor": "orchestrator",
      "type": "status",
      "note": "QA writing tests"
    },
    {
      "at": "2026-10-24T14:25:37Z",
      "mr": "MR-008",
      "actor": "qa",
      "type": "tests",
      "note": "64 failing acceptance tests incl. reported case"
    },
    {
      "at": "2026-10-24T14:29:05Z",
      "mr": "MR-008",
      "actor": "principal",
      "type": "review",
      "note": "changes requested: 1 blocking (missing gate record), 1 nit"
    },
    {
      "at": "2026-10-24T14:30:10Z",
      "mr": "MR-008",
      "actor": "sr-engineer",
      "type": "response",
      "note": "N1 applied (2c290f2); B1 record fixed"
    },
    {
      "at": "2026-10-24T14:30:30Z",
      "mr": "MR-008",
      "actor": "principal",
      "type": "review",
      "note": "round 2 approved"
    },
    {
      "at": "2026-10-24T14:30:30Z",
      "mr": "MR-008",
      "actor": "orchestrator",
      "type": "merge",
      "note": "merged into team/PLAN-002"
    },
    {
      "at": "2026-10-24T14:30:56Z",
      "mr": null,
      "actor": "orchestrator",
      "type": "plan",
      "note": "all MRs merged; awaiting final approval"
    },
    {
      "at": "2026-10-24T14:33:41Z",
      "mr": null,
      "actor": "orchestrator",
      "type": "plan",
      "note": "user approved; merged and PR opened"
    },
    {
      "at": "2026-10-24T15:25:01Z",
      "mr": "MR-009",
      "actor": "orchestrator",
      "type": "status",
      "note": "plan approved; QA writing tests"
    },
    {
      "at": "2026-10-24T15:29:47Z",
      "mr": "MR-009",
      "actor": "qa",
      "type": "tests",
      "note": "35 failing acceptance tests"
    },
    {
      "at": "2026-10-24T15:31:16Z",
      "mr": "MR-009",
      "actor": "orchestrator",
      "type": "gates",
      "note": "green: 509 tests"
    },
    {
      "at": "2026-10-24T15:32:37Z",
      "mr": "MR-009",
      "actor": "sr-engineer",
      "type": "review",
      "note": "changes requested: 1 blocking, 1 nit"
    },
    {
      "at": "2026-10-24T15:37:52Z",
      "mr": "MR-009",
      "actor": "principal",
      "type": "escalation",
      "note": "hop-match rule: compare entity behind the filled link"
    },
    {
      "at": "2026-10-24T15:37:52Z",
      "mr": "MR-009",
      "actor": "qa",
      "type": "tests",
      "note": "417e822: match-check tests (23 failing)"
    },
    {
      "at": "2026-10-24T15:39:50Z",
      "mr": "MR-009",
      "actor": "qa",
      "type": "tests",
      "note": "69c4c92: tests aligned with ruling (44 failing)"
    },
    {
      "at": "2026-10-24T15:41:19Z",
      "mr": "MR-009",
      "actor": "engineer",
      "type": "response",
      "note": "B1 fixed (2309c93); match rule implemented (4521469)"
    },
    {
      "at": "2026-10-24T15:42:10Z",
      "mr": "MR-009",
      "actor": "sr-engineer",
      "type": "review",
      "note": "round 2 approved"
    },
    {
      "at": "2026-10-24T15:42:10Z",
      "mr": "MR-009",
      "actor": "orchestrator",
      "type": "status",
      "note": "principal second review"
    },
    {
      "at": "2026-10-24T15:43:18Z",
      "mr": "MR-009",
      "actor": "principal",
      "type": "review",
      "note": "second pass approved: 3 nits"
    },
    {
      "at": "2026-10-24T15:43:18Z",
      "mr": "MR-009",
      "actor": "orchestrator",
      "type": "merge",
      "note": "merged into team/PLAN-003"
    },
    {
      "at": "2026-10-24T15:43:18Z",
      "mr": "MR-010",
      "actor": "orchestrator",
      "type": "status",
      "note": "QA writing tests"
    },
    {
      "at": "2026-10-24T15:45:46Z",
      "mr": "MR-010",
      "actor": "qa",
      "type": "tests",
      "note": "22 failing acceptance tests"
    },
    {
      "at": "2026-10-24T15:47:35Z",
      "mr": "MR-010",
      "actor": "orchestrator",
      "type": "gates",
      "note": "green: 592 tests; 375px screenshots"
    },
    {
      "at": "2026-10-24T15:48:35Z",
      "mr": "MR-010",
      "actor": "sr-engineer",
      "type": "review",
      "note": "approved: 1 nit (tap target)"
    },
    {
      "at": "2026-10-24T15:49:30Z",
      "mr": "MR-010",
      "actor": "engineer",
      "type": "response",
      "note": "N1 applied (50b7f64)"
    },
    {
      "at": "2026-10-24T15:49:30Z",
      "mr": "MR-010",
      "actor": "orchestrator",
      "type": "status",
      "note": "principal second review"
    },
    {
      "at": "2026-10-24T15:50:20Z",
      "mr": "MR-010",
      "actor": "principal",
      "type": "review",
      "note": "second pass approved: 1 nit (pattern note recorded)"
    },
    {
      "at": "2026-10-24T15:50:20Z",
      "mr": "MR-010",
      "actor": "orchestrator",
      "type": "merge",
      "note": "merged into team/PLAN-003"
    },
    {
      "at": "2026-10-24T15:50:40Z",
      "mr": null,
      "actor": "orchestrator",
      "type": "plan",
      "note": "all MRs merged; awaiting final approval"
    },
    {
      "at": "2026-10-24T15:52:37Z",
      "mr": null,
      "actor": "orchestrator",
      "type": "plan",
      "note": "user approved; merged and PR opened"
    },
    {
      "at": "2026-10-24T16:37:23Z",
      "mr": "MR-011",
      "actor": "orchestrator",
      "type": "status",
      "note": "plan approved; QA writing tests"
    },
    {
      "at": "2026-10-24T16:44:51Z",
      "mr": "MR-011",
      "actor": "qa",
      "type": "tests",
      "note": "131 failing (strict fetch mock + purity)"
    },
    {
      "at": "2026-10-24T16:46:05Z",
      "mr": "MR-011",
      "actor": "orchestrator",
      "type": "gates",
      "note": "green: 528 tests"
    },
    {
      "at": "2026-10-24T16:48:33Z",
      "mr": "MR-011",
      "actor": "sr-engineer",
      "type": "review",
      "note": "approved: 4 nits (carried to MR-012)"
    },
    {
      "at": "2026-10-24T16:48:33Z",
      "mr": "MR-011",
      "actor": "orchestrator",
      "type": "status",
      "note": "principal second review"
    },
    {
      "at": "2026-10-24T16:49:46Z",
      "mr": "MR-011",
      "actor": "principal",
      "type": "review",
      "note": "second pass: changes requested (1 blocking in test support -> QA)"
    },
    {
      "at": "2026-10-24T16:50:36Z",
      "mr": "MR-011",
      "actor": "qa",
      "type": "response",
      "note": "B1/N2 fixed (1a850dc)"
    },
    {
      "at": "2026-10-24T16:51:00Z",
      "mr": "MR-011",
      "actor": "principal",
      "type": "review",
      "note": "second pass round 2 approved"
    },
    {
      "at": "2026-10-24T16:51:00Z",
      "mr": "MR-011",
      "actor": "orchestrator",
      "type": "merge",
      "note": "merged into team/PLAN-004"
    },
    {
      "at": "2026-10-24T16:51:00Z",
      "mr": "MR-012",
      "actor": "orchestrator",
      "type": "status",
      "note": "QA writing tests"
    },
    {
      "at": "2026-10-24T16:57:54Z",
      "mr": "MR-012",
      "actor": "qa",
      "type": "tests",
      "note": "168 failing acceptance tests"
    },
    {
      "at": "2026-10-25T23:09:41Z",
      "mr": "MR-012",
      "actor": "orchestrator",
      "type": "gates",
      "note": "green: 742 tests; 375px overflow observed on long title"
    },
    {
      "at": "2026-10-25T23:11:57Z",
      "mr": "MR-012",
      "actor": "sr-engineer",
      "type": "review",
      "note": "approved: 3 nits (overflow pre-existing, feat-dash edge, contrast)"
    },
    {
      "at": "2026-10-25T23:11:57Z",
      "mr": "MR-012",
      "actor": "orchestrator",
      "type": "status",
      "note": "principal second review"
    },
    {
      "at": "2026-10-25T23:13:54Z",
      "mr": "MR-012",
      "actor": "principal",
      "type": "review",
      "note": "second pass: 1 blocking (feat-dash regex); overflow+contrast to follow-up"
    },
    {
      "at": "2026-10-25T23:14:39Z",
      "mr": "MR-012",
      "actor": "qa",
      "type": "tests",
      "note": "2099903: 4 failing rows for B1"
    },
    {
      "at": "2026-10-25T23:15:28Z",
      "mr": "MR-012",
      "actor": "engineer",
      "type": "response",
      "note": "B1 fixed (a7d0181)"
    },
    {
      "at": "2026-10-25T23:15:48Z",
      "mr": "MR-012",
      "actor": "principal",
      "type": "review",
      "note": "second pass round 2 approved"
    },
    {
      "at": "2026-10-25T23:15:48Z",
      "mr": "MR-012",
      "actor": "orchestrator",
      "type": "merge",
      "note": "merged into team/PLAN-004"
    },
    {
      "at": "2026-10-25T23:16:04Z",
      "mr": null,
      "actor": "orchestrator",
      "type": "plan",
      "note": "all MRs merged; awaiting final approval"
    },
    {
      "at": "2026-10-25T23:24:36Z",
      "mr": null,
      "actor": "orchestrator",
      "type": "plan",
      "note": "user approved; merged and PR opened"
    }
  ]
};
