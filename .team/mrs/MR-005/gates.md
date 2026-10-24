# MR-005 gates

qa_commit: 5f16b8d

## Red (after QA)
- command: `npm test`, exit 1
- 28 tests fail (clipboard/CopyButton modules missing; ResultCard/App copy+share UI missing; literals constants missing); 281 existing pass
- QA commit touches only src/test/ and *.test.*

## Green (round 1)
- npm test: exit 0 (340/340)
- lint/typecheck/build: exit 0
- QA files unchanged since 5f16b8d: yes

## Preview
- result-{light,dark}.png with Odesli stubbed (odesli-track fixture), placeholder artwork

## Green (round 2)
- qa_commit_2: fe3fb78 (shared selectedText/RESET_MS/expectedShareText/FALLBACK_LABEL; test files only)
- npm test: exit 0 (340/340); lint/typecheck/build: exit 0
