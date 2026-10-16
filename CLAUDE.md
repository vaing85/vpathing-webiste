# CLAUDE.md

## Pull requests: Claude reviews the draft, Copilot reviews it once it is ready

The order, set by the owner on 2026-10-13: Claude reviews the draft until a
round finds nothing that blocks, for at most five rounds unless the owner asks
for more (step 2 says what blocks, and what happens at the cap). The owner
marks it ready and requests one Copilot review. Claude addresses that review,
then reviews again until a round finds nothing that blocks (the same cap), and
only then, once the owner says so for the head they saw, is the PR
squash-merged and its branch deleted. The order is the point: Copilot's one
review lands on code that has already had Claude's, rather than racing it, and
what merges is a head that Claude's review has cleared.

Automatic Copilot review is off. The owner turned it off in their own Copilot
settings on 2026-10-13, and on that day no ruleset in this repo had a
`copilot_code_review` rule (check with
`gh api repos/vaing85/vpathing-webiste/rules/branches/main --jq '[.[].type]'`).
So nothing requests a Copilot review by itself any more -- not opening a PR,
not marking it ready, not a push. Copilot reviews a PR only when the owner
requests one, and Claude never does. The steps below still watch for
automatic review, because it can be turned back on in either place.

In a cloud session `gh`'s GraphQL calls are refused (HTTP 403), so use the
GitHub MCP tools there: `create_pull_request` (with `draft: true`),
`update_pull_request` for the body, and `pull_request_read` for check runs and
for the head commit's statuses -- an app outside Actions may post a status
rather than a check run. Resolving a review thread needs GraphQL, so in a cloud
session answer each thread and ask the owner to resolve them.

1. **Open it as a draft** -- `gh pr create --draft`, or `draft: true`. Leave it
   out and the PR opens ready.
2. **While it is a draft, review it until it is clean:**
   - Run `/code-review high <PR number>`. For a finding that does not hold up,
     say why. One that holds up blocks if, in a realistic case, the code would
     report the wrong thing (say merged or green when it isn't) or open a
     security hole, if the change gives an instruction that is simply wrong or
     states something false (in a doc, a comment, help text or a `next:` line
     too), or if the code would do the wrong thing. Each of the first three
     blocks on its own, harm shown or not. For the last, the test is harm to the
     people this repo's app serves (users, callers, players, members, visitors)
     or to the owner, and these are examples, not a closed list: merge, delete,
     deploy, write data, put a call through or drop it, send anyone a message,
     or charge, pay out or refund money when it shouldn't, or fail to when it
     should; show someone a wrong figure, status or outcome, or a profile,
     location, message or page they should not see; leave a limit people rely on
     unenforced (a spending or responsible-gaming limit, a self-exclusion, a
     block); break something a visitor uses (a form, a link, a pricing page),
     deployed by the merge or later by hand; crash in a way someone would
     realistically hit; or request a billed Copilot review (the owner's rule,
     2026-10-14; calls, messages, money and crashes added 2026-10-15; an open
     test since vaing85/dev-verify#51). A rare case where it already stops
     safely and tells the owner does not block a wrong action; a wrong report,
     a security hole or a wrong or false doc still blocks. Nor does code that
     is only slower (more CI time, a slower query), unless it breaks something
     people use -- a page or job that times out or fails is broken -- or runs
     up a bill (an extra call to a metered API counts), which is charging money
     when it shouldn't; nor wording or a tidy-up that leaves nothing wrong or
     false. Fix the blocking ones in the draft. List the rest, one line each,
     under a `Deferred (non-blocking)` heading in the PR body, unfixed. Then
     run it again on the new head, and keep going until a round finds nothing
     that blocks, for at most five rounds (the owner's cap, 2026-10-15). If the
     fifth still finds a blocker, fix it, say in the PR body that no round has
     cleared the fix, and leave it to the owner whether to run a sixth; the
     head is not clean until one does. The same cap holds for every review
     below (after a failing check, after a push, step 5), counted from the
     first round of that review. A round with nothing that blocks ends the
     rounds, however much it defers, and "clean" below means that, with the
     deferred count said alongside. Record every round under a
     `## Code review (draft)` heading in the PR body, so the owner can see what
     was found before marking it ready.
   - Then, after the last fix: run `npx wrangler@4.151.0 deploy --dry-run`.
     It bundles the Worker locally without uploading it: a local smoke check,
     not a copy of Workers Builds, which may run another command and version.
     Then see every check on the PR, Cloudflare's
     `Workers Builds: vpathing-webiste` among them (`AGENTS.md` calls it the
     check that matters), finished on its latest commit as success, neutral or
     skipped (a status: success), and the newest run of each workflow on it
     (per event) finished the same way: one still queued or held, or one that
     failed to start (startup_failure) or was cancelled while queued, has no
     checks to show. Every check the base branch's rulesets require must be
     among them, from the app its rule names if it names one (the
     `required_status_checks` rule in what the intro's `rules/branches` command
     returns with the PR's base in place of `main`, with `--paginate` and
     without its `--jq`): one that has not reported is not green, however green
     the rest are. At least one check must be a success. The success can be a
     check run or a status, from Actions or an outside app, but not from a
     `dynamic` workflow run: one GitHub starts itself rather than from a
     workflow file (the Copilot review, the Copilot coding agent, Dependabot, a
     Pages build), which proves no test passed. A neutral or skipped check does
     not block beside a green one, but it is not green: say how many. Any other
     ending (failed, cancelled, waiting for action) blocks, red or grey --
     except in an older run of an Actions workflow that a newer run for the
     same event replaced, which counts for nothing, as in step 6. On every
     commit checked in October 2026, Cloudflare also left an older Workers
     Builds run `in_progress` next to the finished one, in the same check
     suite, so `gh pr checks` can say pending. Within one check suite only a
     check's newest run counts (`squash-merge.sh` reads it that way), so that
     run does not block; an unfinished run in a suite of its own still does. No
     check running, or none green, is not the same as green: say so. No check
     exercises the contact form or checkout, and a merge to `main` deploys
     itself, so also say in the PR body what you checked by hand. If a check
     fails and fixing it changes the PR, review the fix until a round finds
     nothing that blocks, as above, then run these checks again on the new
     head.
   - If you push again after telling the owner the draft is done, review it
     again until it is clean, repeat the checks above, update that section,
     and tell the owner.
3. **Do not mark it ready, and do not request a Copilot review.** Both are the
   owner's call: no `gh pr ready`, and no `draft: false` on
   `update_pull_request`. The owner requests the one Copilot review after
   marking it ready. A Copilot request or review at any other point -- on a
   draft, when the PR is opened, on a push, or a second review on the same PR
   -- means automatic review is on again, in this repo's ruleset or in the
   owner's own Copilot settings: tell the owner, and push nothing more until
   they say to go on, so a surprise bill stops early. Look for a new one
   before each push. Go by when it happened, not by who the timeline says
   asked: it logs an automatic request under the owner's name, like one they
   made by hand (vaing85/dev-verify#43). Copilot reviews are billed per review
   (the owner's records: $124 in three days of re-reviews), so one per PR is
   the budget.
4. **After it is marked ready, address Copilot's review.** It usually lands
   within minutes of the owner's request. If none has arrived by the time you
   next look at the PR, tell the owner rather than requesting one, and go on to
   step 5 only if they say to skip it. Fix what blocks (step 2's rule; defer
   the rest the same way), and answer every finding on its own thread -- fixed
   in which commit, or why not -- and resolve it. Record the same under a
   `## After Copilot's review` heading in the PR body. Never request a Copilot
   re-review; the one review is the budget, and only the owner requests it.
5. **Then review it again until it is clean.** Run `/code-review high <PR
   number>` on the new head, fix what blocks and defer the rest as in step 2,
   and repeat until a round finds nothing that blocks, within step 2's cap of
   five rounds. Record the rounds under a `## Code review (after Copilot)`
   heading in the PR body. Then repeat step 2's checks on the final head (a
   round that a failing check forces is recorded under this heading too), and
   tell the owner what changed since Copilot's review.
6. **Squash-merge it and delete the branch, when the owner says so** -- for
   the head they saw: after a new push, ask again once step 5 clears it. Run
   dev-verify's `squash-merge.sh`, in bash (Git Bash on Windows), with the
   full 40-character head SHA that step 5 cleared. Not `gh pr merge`, in any
   session: it needs GraphQL, which a cloud session is refused; the script
   uses REST only. Each run fetches the copy on dev-verify's `main`, so every
   repo runs the tested one, and runs it only if the fetch worked. The temp
   copy is left behind on purpose: several repos' guards refuse a forced
   delete, and some repos' permission rules deny every delete command, so a
   delete in this line would get it refused.

   ```
   f="$(mktemp)" && gh api 'repos/vaing85/dev-verify/contents/squash-merge.sh?ref=main' -H 'Accept: application/vnd.github.raw' > "$f" && bash "$f" <owner>/<repo> <PR number> <sha> --message-file <path> --dry-run
   ```

   The message file is what the PR does, in a few lines, plus any trailer lines
   this repo's own rules ask to keep. Write it outside any checkout, with the
   Write tool or a bash heredoc (not PowerShell's `>`), and give its full path
   with forward slashes. The script writes the title itself (the PR's title plus
   ` (#<n>)`) and adds a `Co-authored-by:` line for each other author of the
   branch's commits and each such trailer in them, as GitHub's own squash
   message would; `--no-coauthors` turns that off where this repo's rules
   restrict trailers. For an Actions workflow, what counts is the newest run
   for each event that triggered it, and the checks in that run; an older run
   it replaced counts for nothing. Of what counts, it merges nothing unless
   every workflow run and check run on `<sha>` finished as success, neutral or
   skipped and every status as success (any other ending, cancelled included,
   is refused); unless every check the base branch's rulesets require has
   reported (GitHub would block that merge too, but an admin's token bypasses
   it with only a warning); and unless at least one check run or status is
   green, which neither a workflow run nor a check from a `dynamic` run (step
   2) counts as. A neutral or skipped one does not block beside a green one,
   though it is not green. So a PR whose own CI was skipped entirely is
   refused unless something else is green (an outside app's check or status
   counts, even a scan's). The checks line it prints when it goes ahead says
   how many check runs were skipped, neutral, or green only from a dynamic
   run, and how many checks the base's rulesets require, or that they require
   none (it does not read classic branch protection). The script has no
   override, and Claude merges no other way: if the owner wants
   it merged anyway, they merge it themselves. It merges nothing with merge
   conflicts either. Read the dry run's title, message, branch plan and any
   warning, then run the same line without `--dry-run`.

   Every run that finishes ends with a line starting `next:` that says what the
   result means and what to do about it -- follow that line, and tell the owner
   what it printed. (Its exit codes are in its `--help`; they are not repeated
   here, so this copy cannot fall out of step with the script.) No `next:` line
   means the run never finished, and its exit code means nothing: a hook
   refused the line, the temp file or the fetch failed (as in a cloud session
   whose access covers only this repo, since dev-verify is private), or the run
   was killed outright. It may still have merged, so check whether it merged,
   and at which head against `<sha>`:
   `gh api repos/<owner>/<repo>/pulls/<PR number> --jq '[.merged, .head.sha]'`.
   Tell the owner that and what was printed, and leave the rest to them. A push
   after step 5 means step 5 again, not a merge.

A PR opened ready by mistake skipped the draft review. Leave it ready --
converting it to a draft only means another ready transition later, which
requests, and bills, another review if automatic review is on again -- and
tell the owner the order was missed. If Copilot was requested when it
opened, automatic review is on again and that review is the PR's one: tell
the owner (step 3), and that they should not request another. Once they
say to go on, wait for the review and go on with steps 4 to 6, noting under
a `## Code review (opened ready)` heading that the draft review was
skipped. Otherwise the owner holds off requesting Copilot's review: do step
2's review rounds and checks on it as it stands, record them under that
heading, and tell the owner when it is clean: that is their cue to request
the one Copilot review they held back. Once they have, steps 4 to 6 apply.
