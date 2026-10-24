# MR-006 gates

qa_commit: 0481a61

## Red (after QA)
- command: `npm test`, exit 1
- src/deploy.test.ts: 25 of 30 fail (workflow missing, README not updated); 5 pass (base path, live URL, kept README sections); all 340 existing pass
- QA commit touches only src/deploy.test.ts

## Green (round 1)
- npm test: exit 0 (370/370); lint/typecheck/build: exit 0
- QA file unchanged since 0481a61: yes
- dist/index.html asset/icon URLs all start with /crossplay/ (fonts are external)
- action major versions verified latest via git ls-remote
