---
name: eng-team
description: Run a spec through the engineering team — Principal plans, QA writes failing tests, an engineer implements, a Sr. or Principal reviews in a local merge-request loop, and a director dashboard tracks it all. Use --small for a one-task fast path.
argument-hint: "[--small] <spec text or path to spec .md>"
disable-model-invocation: true
---

# Engineering team run

You are the orchestrator. You do not write product code or tests and you do not review. You move work between roles, run the gates, keep the record, and stop for the user at the two checkpoints.

Input: `$ARGUMENTS`

Roles (plugin subagents — spawn by these names):

| Role | Agent | Writes |
|---|---|---|
| Principal | `principal` | plans; architecture/pattern-setting tasks |
| Sr. Engineer | `sr-engineer` | complex/risky tasks |
| Engineer | `engineer` | well-scoped tasks |
| QA | `qa` | failing tests, first |
| Sr. review | `sr-reviewer` | review (read-only) |
| Principal review | `principal-reviewer` | review, second-pass review, escalations (read-only) |

Run roles **one at a time** and wait for each to finish before the next step. Give every subagent the exact file paths it needs; it has none of this conversation.

After every state change below, update `.team/data.js` (see [state.md](state.md)). That file drives the dashboard and is the log.

---

## 0. Setup (every run)

1. Confirm this is a git repo with a clean working tree, ignoring `.team/`. If not, stop and tell the user.
2. If `.team/` doesn't exist, create it:
   - Copy `${CLAUDE_SKILL_DIR}/templates/standards/` to `.team/standards/` and `${CLAUDE_SKILL_DIR}/templates/dashboard.html` to `.team/dashboard.html`.
   - Write `.team/data.js` with the empty state from [state.md](state.md).
   - Write `.team/config.json` by detecting the stack (see [config.md](config.md)). Show the user the detected commands and ask them to confirm or correct before going further. This is a one-time question.
   - If the repo has a UI but no way to serve it, say so in the same question and offer to add a dev server. On yes, add the framework's standard minimal setup (see [config.md](config.md)), check that `previewUrl` responds and renders without console errors, run the gates, and commit it on `baseBranch` as `eng-team: add dev server`. On no, set `commands.preview` to `null`.
   - Commit: `eng-team: initialize .team/`.
3. Read `.team/config.json`. Check that `baseBranch` exists and matches its remote (`git fetch origin <baseBranch>`; compare with `origin/<baseBranch>`). If it's missing or behind, don't silently branch from a stale tip: ask the user which branch to build on and fix `baseBranch`. If you were started on a detached HEAD or a session branch, ask where the result should land (local merge, or a pushed branch + PR).
4. If `$ARGUMENTS` is a path to a file, read it as the spec; otherwise the arguments are the spec text.
5. **Bug reports.** If the spec reports a bug, before the Principal plans: find the input that reproduces it (the user's link, payload, or steps), read the code path it takes, and write the suspected root cause into the spec. Note whether the external services involved are reachable from this environment; if not, say so in the spec so QA builds fixtures shaped like the real responses, and tell the user live verification wasn't possible. Ask the user any product decision the fix forces (e.g. what to show when data can't be known) at this point, not after the plan.

If `$ARGUMENTS` starts with `--small`, go to **Small-change path**. Otherwise continue.

## 1. Plan → user approval (checkpoint 1)

1. Next ID: `PLAN-NNN`. Spawn `principal` in **plan** mode with the spec and the output path `.team/plans/PLAN-NNN.md`.
2. If it returns blocking questions instead of a plan, ask the user those questions one at a time, then re-run the Principal with the answers appended to the spec.
3. Show the user the acceptance criteria and the task table (ID, title, assignee, complexity). Ask: approve, or what to change. Apply changes by re-running the Principal with the feedback. **Do not continue until the user approves.**
4. Mark the plan `approved`. Create the integration branch `team/PLAN-NNN` from `baseBranch`. Add one MR per task to `data.js` with status `queued`.

## 2. For each task, in dependency order

Let `MR-NNN` be the task's MR, `D = .team/mrs/MR-NNN/`.

**a. Branch.** From `team/PLAN-NNN`: `git switch -c mr/NNN-<slug>`. Write `D/task.md`: the task block from the plan plus the acceptance criteria it covers.

**b. QA writes failing tests.** Status → `tests`. Spawn `qa` with the plan path, `D/task.md`, and the MR ID. Then gate it yourself:
- Every file changed in QA's commit matches `testPaths`. If not, send QA back with the list.
- Run the test command. It must **fail**, and the failures must be the new tests. Exception: a red state the approved plan names for that task (e.g. a pure test move that fails to load until config changes); record it as such. Save the command, exit code, and failing test names to `D/gates.md` under `## Red (after QA)`.
- Record QA's commit SHA in `gates.md` as `qa_commit`.

Status → `implementing`.

**c. Implement.** Spawn the task's assignee (`engineer`, `sr-engineer`, or `principal` in **implement** mode) with: plan path, `D/task.md`, MR ID, and "QA's tests are in commit <sha>; make them pass; write notes to `D/notes.md`." Name the spawn `MR-NNN-author` so it can be resumed.

**d. Gates.** Run test, lint, typecheck from config (skip any that are `null`). Also run `git diff --name-only <qa_commit> HEAD` and check none of QA's test files changed.
- All green → append `## Green (round N)` with results to `gates.md`. Continue.
- Anything red → resume the author with the failure output. Gate failures don't count as review rounds, but after **3** failed gate attempts, escalate (step g).
- QA tests modified → revert those files to `qa_commit`, tell the author why, re-run gates.

**d2. Preview (UI tasks).** If the task has `preview` paths and `commands.preview` is set:
1. Start `commands.preview` in the background and wait until `previewUrl` responds (give up after 60 s and note it in `gates.md`).
2. For each path, screenshot it. If the screen that matters only appears after an external request (a lookup result, a fallback), drive it with a short Playwright script that routes those requests to QA's fixtures, rather than screenshotting only the empty page. Otherwise: `npx -y playwright screenshot --full-page --wait-for-timeout 1000 <previewUrl><path> D/screens/<slug>.png` (first time on this machine: `npx -y playwright install chromium`). Capture light and, if the app supports it, `--color-scheme dark`.
3. Stop the server by the PID you saved when starting it. `npm run` wraps the real server in child processes, and `setsid … &` can fork so `$!` isn't the group leader. After stopping, always confirm `previewUrl` no longer responds; if it still does, find the server with `pgrep -x node` and check each PID's `/proc/<pid>/cmdline` for the dev command before killing it. Never `pkill -f <pattern>`: the pattern also matches your own shell command and kills it mid-step. Write `gates.md` and `diff.patch` in a separate command from starting or stopping servers, and check they exist before spawning the reviewer. Record the files in `data.js` as `screens` (paths relative to `.team/`, e.g. `mrs/MR-003/screens/home.png`).
4. If screenshots fail, continue without them, and note why in `gates.md`. Previews never block an MR.

Re-capture after every round that changes code.

**e. Review.** Status → `in-review`.
1. Write `D/diff.patch` = `git diff team/PLAN-NNN...HEAD`.
2. Pick the reviewer (see **Routing**). Spawn it with: MR ID, plan path, `D/`, round number, and the screenshot paths if there are any. Name it `MR-NNN-reviewer`.
3. It returns a review; save it verbatim to `D/review-N.md`. Read its frontmatter for verdict and counts. Collect the rubric tags for `findings` in `data.js`.

**f. Iterate.**
- `approved` → step g2 if the MR needs a Principal second review (see **Routing**), otherwise step h.
- A blocking comment on a file under `testPaths` (tests, fixtures, test helpers) goes to `qa`, not the author, since the author may not edit QA's files. Resume QA with the review; then gates and re-review as below.
- `changes-requested` and round < `maxReviewRounds` → status `changes-requested`; resume `MR-NNN-author` with the review path and "address every blocking comment; write `D/response-N.md`." Then gates (d) and re-review (e) by resuming `MR-NNN-reviewer` with the response path. If resuming isn't possible, spawn fresh with the same paths.
- `changes-requested` at round = `maxReviewRounds` → step g.

**g2. Principal second review.** Status stays `in-review`; set `stage: "second"` and `second_reviewer: "principal"` in `data.js`.
1. Refresh `D/diff.patch` (the code may have changed during the first pass).
2. Spawn `principal-reviewer` in **second-pass** mode with: MR ID, plan path, `D/`, and every first-pass review and response. Name it `MR-NNN-principal`. Save its review to `D/principal-review-N.md`.
3. `approved` → step h. `changes-requested` → resume `MR-NNN-author` with that review; it writes `D/principal-response-N.md`. Then gates (d) and re-review by resuming `MR-NNN-principal`. The first reviewer doesn't re-review.
4. Same round cap. At the cap, escalate straight to the user (step g, second bullet).

**g. Escalate.**
- Sr. was the reviewer → spawn `principal-reviewer` with every review and response for the MR; its verdict is final for the agents. If it still requests changes, one more author round, then its re-review.
- Principal was the reviewer, or the Principal's settlement still fails → **stop and ask the user.** Write `D/escalation.md` (the disputed comments, both sides, one line each), set status `escalated`, and show the user that summary.

**h. Merge.** Status `approved`, `stage: "done"`. Switch to `team/PLAN-NNN`, `git merge --no-ff mr/NNN-<slug> -m "MR-NNN: <title>"`, status `merged`. Next task.

## 3. Final approval (checkpoint 2)

When every MR is merged into `team/PLAN-NNN`:
1. Run all gates on `team/PLAN-NNN`. If previews are on, screenshot every `preview` path from the plan into `.team/plans/PLAN-NNN/screens/` and add them to the plan's `screens` in `data.js`. Then start `commands.preview` in the background and leave it running so the user can try the result at `previewUrl` before deciding.
2. Tell the user, briefly: where to try it (`previewUrl`, and the screenshots on the dashboard), MRs merged, review rounds per MR (first and second pass), anything escalated, any Principal-authored MR (flag these for their eyes), and `git diff <baseBranch>...team/PLAN-NNN --stat`.
3. Ask whether to merge `team/PLAN-NNN` into `baseBranch` (or, if the user chose a pushed branch + PR at setup, whether to push and open the PR). Stop the preview server once they've answered. Only merge on an explicit yes. Plan status → `done`, then commit the `.team/` record on `baseBranch`: `eng-team: record PLAN-NNN`.

---

## Small-change path (`--small`)

For one small change in an existing pattern. No plan, no QA step, no checkpoint 1.

1. `MR-NNN` with `size: small`, assignee `engineer`. Branch `mr/NNN-<slug>` from `baseBranch`. Write `D/task.md` from the spec.
2. Spawn `engineer` with the **small-change path** instruction: failing test first in its own commit, then the fix.
3. Verify red-before-green yourself: check out the test commit, run tests (must fail), return to HEAD. Record in `gates.md` with `qa_commit` = the test commit.
4. Gates, review, iterate, escalate exactly as steps d–g, with the diff taken against `baseBranch`.
5. When approved, tell the user the result and ask whether to merge into `baseBranch`. On yes, merge, then commit the `.team/` record: `eng-team: record MR-NNN`.

If the engineer reports the change isn't small (new pattern, several areas), stop and suggest running without `--small`.

---

## Routing

| Author | Reviewer |
|---|---|
| engineer | `sr-reviewer`, unless the Sr. is busy → `principal-reviewer` |
| sr-engineer | `principal-reviewer` |
| principal | `sr-reviewer`, and flag the MR `needs_user: true` for the final summary |

**Principal second review.** After the first reviewer approves, the Principal does a second, architecture-focused pass (step g2) when **all** of these hold:
- the first reviewer was the Sr. (if the Principal already reviewed, there's nothing to add), and
- the Principal didn't author it (nobody reviews their own work), and
- the task has `sets_pattern: true` **or** `complexity: medium` or `high`.

Set `second_reviewer: "principal"` on the MR when you queue it, so the dashboard shows it's coming.

**Sr. is busy** when `data.js` has an MR not yet `merged` whose author is `sr-engineer` and whose status is not `queued`, or an MR whose reviewer is `sr-engineer` with status `in-review` or `changes-requested`. Record the reason on the MR (`routing: "sr busy with MR-004"`).

Nobody reviews their own work.

## Rules for you

- Never edit product code or tests yourself, and never soften a review. If something is stuck, escalate.
- Keep commits on MR branches; never commit to `baseBranch` except `.team/` setup, the user-approved final merge, and the `.team/` record after it.
- Don't commit `.team/` during a run. It stays as working-tree changes so it survives branch switches and the dashboard never shows a stale state. It's committed once, after the final merge.
- If a subagent stops mid-task (rate limit, API error), resume it with SendMessage instead of re-spawning; it keeps its context. Re-spawn only if resuming fails (after a session or worker restart, named agents are gone: check `git status` and the MR branch for partial work, then re-spawn with the same paths).
- Push MR and integration branches when the session may be reclaimed (cloud sessions); that's not a merge and doesn't break the "no commits to baseBranch" rule. `.team/` still stays uncommitted until the end.
- If a subagent returns something unusable (no commits, wrong files, malformed review), retry it once with the problem stated; then escalate.
- Tell the user only at checkpoints, escalations, and the end. Otherwise keep going; the dashboard shows progress. Mention once at the start: open `.team/dashboard.html` to watch.
