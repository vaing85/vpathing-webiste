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
  contact.html        # Contact form (FormSubmit.co + Turnstile)
  404.html            # Custom not-found page (Cloudflare Pages)
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

### Contact form (FormSubmit.co)

- The contact form uses [FormSubmit.co](https://formsubmit.co): no signup, submissions go to **villa.aing@vpathingenterprisellc.site**.
- First time you submit, FormSubmit sends a one-time confirmation link to that email; after you confirm, all future submissions deliver normally.
- To change the destination email, edit the form `action` in **contact.html** (e.g. `https://formsubmit.co/your@email.com`).

### Cloudflare Turnstile (spam protection)

1. In [Cloudflare Dashboard](https://dash.cloudflare.com), go to **Turnstile** (search “Turnstile” in the sidebar).
2. Click **Add site**. Enter your site name and domain (e.g. vpathingenterprisellc.site). Choose a widget type (e.g. Managed).
3. Copy the **Site key**.
4. In **contact.html**, find the Turnstile widget and set `data-sitekey="YOUR_SITE_KEY"`.
5. **Secret key:** Keep it for server-side verification only (e.g. webhook). Do not put it in HTML. The form works with client-side Turnstile alone.

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
- **Form:** FormSubmit.co (destination email in **contact.html** form `action`).
- **Spam:** Cloudflare Turnstile (site key in **contact.html**).
- **Optional dev:** `npm run build-social-card` to regenerate **assets/social-card.png** from the brand kit (requires Node + `sharp`, and Python + `fonttools`).

All set for a clean, professional, mobile-friendly static site you can push to GitHub and deploy to Cloudflare Pages.
