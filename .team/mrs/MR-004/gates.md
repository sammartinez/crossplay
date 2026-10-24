# MR-004 gates

qa_commit: b8a6e8a

## Red (after QA)
- command: `npm test`, exit 1
- 44 new tests fail (ConvertForm/ResultCard unresolved imports; App tests missing placeholder/status; literals.test.ts missing constants); 183 pass incl. all 167 existing
- QA commit touches only *.test.* files

## Green (round 1)
- npm test: exit 0 (257/257)
- lint/typecheck/build: exit 0
- QA files unchanged since b8a6e8a: yes

## Preview
- live lookups blocked by sandbox egress (api.song.link, open.spotify.com); result screenshot taken with Odesli stubbed from src/test/fixtures/odesli-track.json and placeholder artwork

## Red/green (QA addendum for review-1 B1, N3)
- qa_commit_2: 2a6650e (test files only)
- B1 test "does not replace the page URL when the lookup finishes": FAILS against useConversion.ts @ 0bcc5de^ (expected ?u= null, got canonical link); passes on HEAD
- N3: artwork assertions now unconditional
- npm test on HEAD: 258/258

## Green (round 2)
- npm test: exit 0 (258/258)
- lint/typecheck/build: exit 0
- QA files unchanged since 2a6650e: yes

## Green (round 3)
- qa_commit_3: 1a7a0c0 (shared src/test/dom.ts helper; test files only)
- npm test: exit 0 (258/258)
- lint/typecheck/build: exit 0

## Green (principal round 2)
- qa_commit_4: 54ea5a9 (resultRow + expectNotShown into src/test/dom.ts; test files only)
- npm test: exit 0 (258/258); lint/typecheck/build: exit 0
