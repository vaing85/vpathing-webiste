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
couple of minutes, through **Cloudflare Workers Build**. The Worker serves the
whole site: the static HTML through the `[assets]` binding (`directory = "."`)
and `/api/*` through `src/index.js`. So a merge ships itself; there is no manual
deploy step, and **Workers Builds is the check that matters**. (Cloudflare
reports status via GitHub **check-runs**, not the legacy commit-status API — a
`pending`/empty combined status is not a failure.)

GitHub **Pages** is still configured, and `.github/workflows/deploy.yml` still
succeeds on every push — but it serves **no live traffic**. The `CNAME` file
points Pages at the custom domain, so `vaing85.github.io/vpathing-webiste/` just
301s there, and that domain resolves to Cloudflare, where the Worker answers.
Quick way to confirm: `GET /api/contact` on the live site returns the Worker's
own `405 {"ok":false,"error":"Method not allowed."}`, which Pages cannot
produce. Don't wait on a Pages run to decide whether a change shipped.

## Related repos

- `call-assistant` — the backend (one brain; this site drives web checkout into
  it). It is **manual-deploy**, and its agent guard blocks prod/money commands,
  so a change here that depends on backend behavior needs the backend deployed
  and verified separately.
- `call-assistant-app` / `call-screen-poc` — the mobile clients, build-distributed.

Each repo has its own `AGENTS.md`; a rule worth having everywhere must be copied
into each.
