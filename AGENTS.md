# Working in this repo

Marketing site for V Pathing Enterprise: static HTML at the root plus a
Cloudflare Worker (`src/index.js`) that serves `/api/*` (Turnstile-verified
contact form + Stripe web-checkout). The GitHub remote is `vaing85/vpathing-webiste`
— note the misspelling.

## Verifying third-party platforms

Before asserting how **any** third-party platform behaves — Cloudflare
(Workers/Pages), GitHub, Stripe, Turnstile, FormSubmit — fetch the vendor's
current docs and confirm. If you cannot verify a claim, say "unverified" rather
than writing it into config as fact.

When the user reports what the real world did — a form didn't deliver, a deploy
didn't land, checkout failed — that is authoritative over your inference. Update
to it immediately instead of explaining around it.

## Deploying

Unlike the backend, this repo **auto-deploys on merge to `main`** — within a
couple of minutes, through **both** pipelines at once: GitHub **Pages** serves
the static HTML, and **Cloudflare Workers Build** deploys the Worker that serves
`/api/*`. So a merge ships itself; there is no manual deploy step. (Cloudflare
reports status via GitHub **check-runs**, not the legacy commit-status API — a
`pending`/empty combined status is not a failure.)

## Related repos

- `call-assistant` — the backend (one brain; this site drives web checkout into
  it). It is **manual-deploy**, and its agent guard blocks prod/money commands,
  so a change here that depends on backend behavior needs the backend deployed
  and verified separately.
- `call-assistant-app` / `call-screen-poc` — the mobile clients, build-distributed.

Each repo has its own `AGENTS.md`; a rule worth having everywhere must be copied
into each.
