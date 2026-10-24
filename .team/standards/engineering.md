# Engineering Standards

Every role reads this before starting work. Repo conventions beat this file: when the codebase already does something one way, do it that way.

## Test-driven development

1. QA writes failing tests from the acceptance criteria and the interface in the plan. QA commits them alone.
2. The tests must fail before implementation starts, and fail because the behavior is missing (an assertion, or the new module not existing yet), not because of a typo or broken setup.
3. The implementer makes them pass. The implementer may add unit tests of their own.
4. **The implementer never edits or deletes QA's tests.** If a QA test is wrong, say so in the MR notes; the reviewer decides, and QA makes the change.
5. Tests exercise behavior through public interfaces: function signatures, HTTP endpoints, rendered output. No asserting on private state or on mocks of the code under test. Mock only what crosses a process boundary (network, clock, filesystem) and only when the real thing is impractical.

## Reuse and constants (DRY)

- **Constants live in the constants file**, never inline in the module that uses them. The path is `paths.constants` in `.team/config.json` (default `src/constants.ts`). If the file is missing, create it. This covers **every** literal value: all user-facing text (labels, button text, headings, placeholders, messages), delays, limits, regexes, keys, routes, and URLs. The only exceptions are `0`, `1`, `""`, `true`/`false`, and `null`. A plan that lists some constants doesn't exempt the ones it didn't list.
- **Search before you write.** Before adding a function, component, hook, or type, look for an existing one that does the job (`paths.shared`, then the rest of the codebase) and use it.
- **Reusable logic goes in a shared module from the start.** Logic that isn't tied to one feature (validation, formatting, parsing, date and number helpers, fetch wrappers, generic UI pieces) goes under `paths.shared` (default `src/lib/`), one module per concern, **on first use**. Don't wait for a second caller. Feature-specific logic stays with its feature.
- **Duplication is a blocking review finding.** If the same logic appears twice, extract it.
- This is about real logic and values. It is not a license for speculative interfaces, factories, or config options ([S2] still applies).

## Full stack

Engineers work on any layer. The same standards apply everywhere:
- **API:** validate input once at the boundary; return consistent error shapes; status codes that mean what they say.
- **Backend:** no swallowed errors; side effects at the edges; transactions where partial writes would corrupt state.
- **Frontend:** follow the existing component and state patterns; semantic HTML and labels; loading and error states are part of the feature, not extras.
- **Data:** migrations are reversible or the MR says why not.

## Scope

- Do the task in the plan. Nothing else.
- If the task is wrong or underspecified, stop and report it rather than inventing requirements.
- Don't reformat or refactor files you weren't asked to touch.

## Commits

- One logical change per commit. Subject in imperative mood, ≤ 72 chars, prefixed with the MR ID: `MR-003: sort listings by list date`.
- Body only when the *why* isn't obvious.
- Add a trailer naming the role: `Role: engineer`.
- Never stage or commit anything under `.team/`. Stage your files by path, not with `git add -A` or `git add .`.

## Before you hand off

Run the gate commands from `.team/config.json` yourself (test, lint, typecheck). Don't hand off red.

## MR notes

When you finish, write `.team/mrs/<MR-ID>/notes.md`: what changed (one paragraph), any decision a reviewer should know about, and anything you were unsure of. Short. No restating the diff.
