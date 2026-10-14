# CLAUDE.md

## Pull requests: Claude reviews the draft, Copilot reviews it once it is ready

The order, set by the owner on 2026-10-13: Claude reviews the draft until
nothing it finds is left unaddressed. The owner marks it ready and requests
one Copilot review. Claude addresses that review, then reviews again until
nothing is left, and only then is the PR squash-merged and its branch
deleted. The order is the point: Copilot's one review lands on code that has
already had Claude's, rather than racing it, and what merges is a head that
Claude's review has cleared.

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
session answer each thread and ask the owner to resolve them. `gh pr merge`
needs GraphQL too, so step 6 there goes through REST, which takes the head
pin (`<o>/<r>` is owner/repo):
`gh api -X PUT repos/<o>/<r>/pulls/<n>/merge -f merge_method=squash -f sha=<sha>`
then `gh api -X DELETE repos/<o>/<r>/git/refs/heads/<branch>`. If REST is
refused as well, ask the owner to merge and delete the branch.

1. **Open it as a draft** -- `gh pr create --draft`, or `draft: true`. Leave it
   out and the PR opens ready.
2. **While it is a draft, review it until it is clean:**
   - Run `/code-review high <PR number>`. Fix each finding that holds up, in
     the draft. For one that does not, say why. Then run it again on the new
     head, and keep going until a round finds nothing that holds up. Record
     every round under a `## Code review (draft)` heading in the PR body, so
     the owner can see what was found before marking it ready.
   - Then, after the last fix: the only check on pull requests is Cloudflare's
     `Workers Builds: vpathing-webiste` (`AGENTS.md` calls it the check that
     matters): see it green on the PR's latest commit. No check running is not
     the same as green: say so. A merge to `main` deploys itself, so also say
     in the PR body what you checked by hand before the owner merges.
   - If you push again after telling the owner the draft is done, review it
     again until it is clean, update that section, and tell the owner.
3. **Do not mark it ready, and do not request a Copilot review.** Both are the
   owner's call: no `gh pr ready`, and no `draft: false` on
   `update_pull_request`. The owner requests the one Copilot review after
   marking it ready. A Copilot request or review at any other point -- on a
   draft, when the PR is opened, on a push, or a second review on the same PR
   -- means automatic review is on again, in this repo's ruleset or in the
   owner's own Copilot settings: tell the owner. Go by when it happened, not
   by who the timeline says asked: it logs an automatic request under the
   owner's name, like one they made by hand (vaing85/dev-verify#43). Copilot
   reviews are billed per review (the owner's records: $124 in three days of
   re-reviews), so one per PR is the budget.
4. **After it is marked ready, address Copilot's review.** It usually lands
   within minutes of the owner's request. If none has arrived by the time you
   next look at the PR, tell the owner rather than requesting one, and go on
   to step 5 only if they say to skip it. Fix what holds up, and answer every
   finding on its own thread -- fixed in which commit, or why not -- and
   resolve it. Record the same under a `## After Copilot's review` heading in
   the PR body. Never request a Copilot re-review; the one review is the
   budget, and only the owner requests it.
5. **Then review it again until it is clean.** Run
   `/code-review high <PR number>` on the new head, fix what holds up, and
   repeat until a round finds nothing that holds up. Record the rounds under a
   `## Code review (after Copilot)` heading in the PR body. Then repeat step
   2's checks on the final head, and tell the owner what changed since
   Copilot's review.
6. **Squash-merge it and delete the branch, when the owner says so.** Pin the
   merge to the head that step 5 cleared, and let it delete the branch:
   `gh pr merge <PR number> --squash --delete-branch --match-head-commit <sha>`
   A push after step 5 means step 5 again, not a merge.

A PR opened ready by mistake skipped the draft review. Leave it ready --
converting it to a draft only means another ready transition later, which
requests, and bills, another review if automatic review is on again -- and
tell the owner the order was missed, so they hold off requesting Copilot's
review. Then do step 2's review rounds and checks on it as it stands, record
them under a `## Code review (opened ready)` heading so the missed order shows
there too, and tell the owner when it is clean: that is their cue to request
the one Copilot review they held back. Once they have, steps 4 to 6 apply.
