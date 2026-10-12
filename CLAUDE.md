# CLAUDE.md

## Pull requests: Claude reviews the draft, Copilot reviews it once it is ready

Claude reviews every PR first, then Copilot. The order is the point: the owner
marks a PR ready only after Claude's review is done, so Copilot's review lands
on code that has already had one, rather than racing it.

In a cloud session `gh`'s GraphQL calls are refused, so use the GitHub MCP
tools there: `create_pull_request` (with `draft: true`), `update_pull_request`
for the body, and `pull_request_read` for check runs.

1. **Open it as a draft** -- `gh pr create --draft`, or `draft: true`. Leave it
   out and the PR opens ready.
2. **While it is a draft:**
   - Run `/code-review high <PR number>`. Fix each finding that holds up, in
     the draft. For one that does not, say why. Record both under a
     `## Code review (draft)` heading in the PR body, so the owner can see
     what was found before marking it ready.
   - Then, after the last fix: this repo has no CI on pull requests, and a
     merge to `main` deploys itself (see `AGENTS.md`), so say in the PR body
     what you checked by hand before the owner merges.
3. **Do not mark it ready, and do not request a Copilot review.** Both are the
   owner's call. Marking it ready is what requests Copilot's review. Copilot is
   set not to review drafts; if it ever reviews one, tell the owner, because
   the repo's Copilot rule then needs "Review draft pull requests" off.
   Copilot reviews are billed per review, so one per PR is the budget.
4. **After it is marked ready:** Copilot reviews it. Fix what holds up and push
   the fixes together, in one push, in case new pushes also trigger a review.
   Answer every finding on its own thread -- fixed in which commit, or why
   not -- and resolve it. Then run `/code-review high <PR number>` on the new
   head, see the checks green again, and tell the owner what changed since
   Copilot's review. Never request a Copilot re-review; that is the owner's
   call.

A PR opened ready by mistake has already had Copilot's review. Leave it ready:
converting it to a draft only means another ready transition later, which may
request, and bill, another review. Run step 2's `/code-review` on it anyway,
answer Copilot's threads as in step 4, and tell the owner the order was missed.
