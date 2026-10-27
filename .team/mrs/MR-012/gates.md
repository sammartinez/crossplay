# MR-012 gates

qa_commit: ad0b4df9ce27848d7a63d80f243e387dcf5ef343

## Red (after QA)
- npm test → 168 failed, 574 passed (742). text.test.ts 106 (cleanTitle/sameTitle missing); lookup/api/hook/App (no auto-pick, likely undefined); links (likely not derived); ResultCard/App (no LIKELY tag/class/CSS); literals (TAG_LIKELY + class constants); N2 blank title still searches iTunes; deploy (README lacks LIKELY).
- QA commit touches only tests/. Includes carried N2 (blank oEmbed title → NOT_FOUND, no iTunes request) and N3 (shared answerJson).

## Green (round 1)
- After 20adc80, 31c3dec: npm test 19 files / 742 passed; lint 0, typecheck 0, build 0. tests/ unchanged since ad0b4df.
- Screens at 375px (oEmbed/iTunes routed to QA fixtures): screens/likely-{light,dark}.png (unique-match fixture), screens/picker-{light,dark}.png (reported case).
- Orchestrator observation: the likely-* screenshots are 448px wide at a 375px viewport, i.e. the page scrolls horizontally with the long title "Rollin' Down To Memphis - Remastered 2015" / its picker buttons. picker-* are 375px. Reviewer to decide whether it's this MR's or pre-existing.

## Red (QA, Principal B1)
qa_commit: 2099903
- npm test → 4 failed, 745 passed (749): cleanTitle/sameTitle "Song - feat. X - Live" and "- Remix" (dash feat regex swallows the version marker). Remastered row already passes.

## Green (second pass, round 2)
- After a7d0181: npm test 749 passed; lint 0, typecheck 0, build 0. tests/ unchanged since 2099903. diff.patch refreshed.
