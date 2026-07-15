# VPathing Enterprise LLC — Company Website

Static, mobile-friendly company website for **VPathing Enterprise LLC**. No frameworks, no build step. Deploy to Cloudflare Pages from GitHub.

- **Tagline:** “Building practical apps for real-world operations.”
- **Contact email:** villa.aing@vpathingenterprisellc.site
- **Live site:** https://vpathingenterprisellc.site

---

## Project structure

```
/
  index.html          # Home
  apps.html           # Portfolio (apps from data/apps.json)
  about.html          # About (mission, services, process)
  contact.html        # Contact form (posts to /api/contact)
  404.html            # Custom not-found page (served by not_found_handling)
  robots.txt          # Crawler rules + sitemap reference
  sitemap.xml         # SEO sitemap
  css/
    styles.css        # Design system, layout, skip-link
  js/
    main.js           # Nav, apps grid, filters, form submit
  data/
    apps.json         # Apps list (edit to add/change apps)
  assets/
    favicon.svg       # Favicon (VPE glyph on the brand Ink tile)
    social-card.svg   # Generated OG image source — see build-social-card
    social-card.png   # 1200×630 — rasterised from the SVG for link previews
    brand/            # VPE brand kit (marks, lockups, icons, email variants)
    fonts/            # Self-hosted Inter / Space Grotesk / IBM Plex Mono (woff2)
  scripts/
    build-social-card.py      # Composes social-card.svg from the brand kit
    build-brand-assets.js     # Rasterises it to PNG  — npm run build-social-card
  package.json       # Dev scripts (social card build only)
  README.md
```

---

## Run locally

**Option 1 — Open in browser**

- Double-click `index.html` or open it from your file manager.
- Links use absolute paths (`/`, `/apps.html`). For full navigation, use a local server (Option 2).

**Option 2 — Simple local server (recommended)**

```bash
# From project root (e.g. vpathing-website/)
npx serve .
# or
python -m http.server 3000
```

Then open `http://localhost:3000` (or the port shown).

---

## Deploy to Cloudflare Pages (from GitHub)

1. **Push this project to a GitHub repo**
   - Create a new repo, then:
   ```bash
   git init
   git add .
   git commit -m "Initial commit — VPathing Enterprise LLC website"
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

2. **In Cloudflare Dashboard**
   - Go to **Pages** → **Create a project** → **Connect to Git**.
   - Select your GitHub account and the repo you just pushed.

3. **Build settings**
   - **Framework preset:** None
   - **Build command:** (leave blank)
   - **Build output directory:** `/` (root)
   - Click **Save and Deploy**.

4. **Result**
   - Cloudflare will deploy the repo as-is (no build). Your site will be live at `https://<project-name>.pages.dev`.

5. **Custom domain**
   - In the Pages project → **Custom domains** → add your domain and follow DNS instructions (e.g. vpathingenterprisellc.site).

---

## Form and spam protection

The contact form posts to **`/api/contact`**, handled by the Worker in
**src/index.js**. The Worker verifies the Turnstile token with Cloudflare, and
only forwards to [FormSubmit.co](https://formsubmit.co) if that check passes.

It routes through a Worker rather than posting to FormSubmit directly for two
reasons. Turnstile is only real if something checks the token server-side, and
that requires a secret key a static page cannot hold. And the form backend stays
out of the HTML, so a bot cannot post straight to it and skip the check.

### Required secrets

Neither value belongs in the repo. Set both with `wrangler secret put` — they
are stored by Cloudflare and never printed back:

```sh
npx wrangler secret put TURNSTILE_SECRET_KEY   # paste when prompted
npx wrangler secret put FORMSUBMIT_CODE
```

| Secret | Where it comes from |
|---|---|
| `TURNSTILE_SECRET_KEY` | Cloudflare Dashboard → **Turnstile** → your widget → **Secret key**. Pairs with the `data-sitekey` in contact.html. |
| `FORMSUBMIT_CODE` | FormSubmit dashboard, after activating the destination address. Prefer their **hash** (e.g. `abc123…`) over the raw email: the hash is not guessable, so bots cannot post to your FormSubmit endpoint directly. |

**Activation:** FormSubmit needs one confirmed submission before it delivers
anything. The first send triggers a confirmation link to the destination
address — click it once, and later sends go through.

Without either secret the endpoint returns a 500 and the form tells the visitor
to email instead. It never claims a message was sent when it was not.

### Turnstile widget

The site key is public and lives in **contact.html** (`data-sitekey`). To point
it at a different widget: Cloudflare Dashboard → **Turnstile** → **Add site**,
copy the **Site key** into `data-sitekey`, then set the matching secret key with
`wrangler secret put TURNSTILE_SECRET_KEY`.

### Local development

`wrangler dev` reads secrets from **.dev.vars** (gitignored). Cloudflare
publishes [dummy test keys](https://developers.cloudflare.com/turnstile/troubleshooting/testing/)
so you never need the real secret locally — `1x0000000000000000000000000000000AA`
always passes and `2x0000000000000000000000000000000AA` always fails:

```sh
# .dev.vars
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
FORMSUBMIT_CODE=local-dev-placeholder
```

The `worker` config in `.claude/launch.json` passes `--persist-to` a directory
outside the repo. That is not optional: `[assets] directory = "."` makes
`wrangler dev` watch the repo root, and wrangler's own state under `.wrangler/`
lives there too — so it sees its own writes, reloads, writes again, and the
server never finishes starting.

---

## Social preview image (OG / Twitter)

**assets/social-card.png** (1200×630) is the link preview for every page. It is
generated from the VPE brand kit — do not hand-edit it.

```bash
npm install
npm run build-social-card
```

That runs two steps:

1. **scripts/build-social-card.py** — composes **assets/social-card.svg** from
   `assets/brand/`, converting the IBM Plex Mono wordmark to **vector outlines**.
2. **scripts/build-brand-assets.js** — rasterises that SVG to
   **assets/social-card.png** via sharp.

Requires Node (`sharp`) and Python (`pip install fonttools brotli`).

**Why the wordmark is outlined and not `<text>`:** sharp rasterises SVG through
librsvg, which resolves fonts from the *system* font list and cannot read our
self-hosted `.woff2`. An SVG `<text font-family="IBM Plex Mono">` would silently
render as Courier anywhere Plex isn't installed — including CI. Outlines remove
the font dependency entirely.

Then commit the updated `assets/social-card.svg` and `assets/social-card.png`.
The build is reproducible: re-running it on unchanged sources produces an
identical file.

---

## Editing the apps list

- Edit **data/apps.json** to add, remove, or update apps.
- Each app can have:
  - `name` — App name
  - `description` — Short description
  - `status` — `"In development"` | `"MVP"` | `"Live"`
  - `tags` — Array of strings (e.g. `["logistics", "delivery"]`)
  - `links` — Optional: `website`, `demo`, `github` (URLs). If missing or empty, the site shows “Coming soon”.

Example:

```json
{
  "name": "My App",
  "description": "Short description here.",
  "status": "Live",
  "tags": ["web", "dashboard"],
  "links": {
    "website": "https://myapp.example.com",
    "github": "https://github.com/username/repo"
  }
}
```

After editing, commit and push; Cloudflare Pages will deploy the updated content.

---

## SEO and accessibility

- **Meta:** Title and description on every page. Open Graph and Twitter Card on index, about, apps, contact for link previews.
- **Canonical URLs:** Set on index, about, apps, contact to avoid duplicate-content issues.
- **robots.txt:** Allows crawlers and points to **sitemap.xml**.
- **sitemap.xml:** Lists main pages (/, /apps.html, /about.html, /contact.html). 404 is not listed.
- **Skip link:** “Skip to main content” is the first focusable element on every page (visible on keyboard focus) for screen reader and keyboard users.
- **404:** Custom **404.html** is served by Cloudflare Pages for unknown paths; it is noindexed.

---

## Tech summary

- **Stack:** HTML, CSS, JavaScript only. No frameworks, no build step for the site itself.
- **Hosting:** Cloudflare Pages (GitHub → Pages, build command blank, output directory `/`).
- **Form:** posts to `/api/contact` (**src/index.js**), which verifies Turnstile then forwards to FormSubmit.co. Needs the `TURNSTILE_SECRET_KEY` and `FORMSUBMIT_CODE` secrets — see [Form and spam protection](#form-and-spam-protection).
- **Spam:** Cloudflare Turnstile, verified server-side in the Worker (site key in **contact.html**).
- **Optional dev:** `npm run build-social-card` to regenerate **assets/social-card.png** from the brand kit (requires Node + `sharp`, and Python + `fonttools`).

All set for a clean, professional, mobile-friendly static site you can push to GitHub and deploy to Cloudflare Pages.
