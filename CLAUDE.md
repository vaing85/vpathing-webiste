# CLAUDE.md

## Pull requests: Claude reviews the draft, Copilot reviews it once it is ready

Claude reviews every PR first, then Copilot. The order is the point: the owner
marks a PR ready only after Claude's review is done, so Copilot's review lands
on code that has already had one, rather than racing it.

In a cloud session `gh`'s GraphQL calls are refused (HTTP 403), so use the
GitHub MCP tools there: `create_pull_request` (with `draft: true`),
`update_pull_request` for the body, and `pull_request_read` for check runs.

1. **Open it as a draft** -- `gh pr create --draft`, or `draft: true`. Leave it
   out and the PR opens ready.
2. **While it is a draft:**
   - Run `/code-review high <PR number>`. Fix each finding that holds up, in
     the draft. For one that does not, say why. Record both under a
     `## Code review (draft)` heading in the PR body, so the owner can see
     what was found before marking it ready.
   - Then, after the last fix: the only check on pull requests is Cloudflare's
     `Workers Builds: vpathing-webiste` (`AGENTS.md` calls it the check that
     matters): see it green on the PR's latest commit. A merge to `main`
     deploys itself, so also say in the PR body what you checked by hand
     before the owner merges.
   - If you push again after telling the owner the draft is done, run the
     review again, update that section, and tell the owner.
3. **Do not mark it ready, and do not request a Copilot review.** Both are the
   owner's call: no `gh pr ready`, and no `draft: false` on
   `update_pull_request`. Marking it ready is what requests Copilot's review
   (GitHub's automatic review runs when a draft is first marked ready; seen on
   dev-verify#39). If Copilot ever reviews a draft, tell the owner: "Review
   draft pull requests" is on somewhere -- in this repo's ruleset or in their
   own Copilot settings. Copilot reviews are billed per review (the owner's
   records: $124 in three days of re-reviews), so one per PR is the budget.
4. **After it is marked ready:** Copilot reviews it. If no review arrives,
   tell the owner rather than requesting one. Fix what holds up and push the
   fixes together, in one push, in case new pushes also trigger a review.
   Answer every finding on its own thread -- fixed in which commit, or why
   not -- and resolve it. Then run `/code-review high <PR number>` on the new
   head, repeat step 2's checks on it, and tell the owner what changed since
   Copilot's review. Never request a Copilot re-review; that is the owner's
   call.

A PR opened ready by mistake has already requested Copilot's review. Leave it
ready -- converting it to a draft only means another ready transition later,
which may request, and bill, another review -- and tell the owner the order was
missed. Then follow step 4, with one addition: also run
`/code-review high <PR number>`, record its outcome in the PR body as in step
2, and put its fixes in step 4's one push alongside Copilot's -- or, if no
Copilot review arrives, hold them until the owner says to push.
