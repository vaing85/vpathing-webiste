# VPathing Enterprise LLC — Company Website

Static, mobile-friendly company website for **VPathing Enterprise LLC**. No frameworks, no build step. Deploy to Cloudflare Pages from GitHub.

- **Tagline:** “Building practical apps for real-world operations.”
- **Contact email:** vpathingenterprise@gmail.com

---

## Project structure

```
/
  index.html          # Home
  apps.html           # Portfolio (apps from data/apps.json)
  about.html          # About (mission, services, process)
  contact.html        # Contact form (Formspree + Turnstile)
  css/
    styles.css        # Design system and layout
  js/
    main.js           # Nav, apps grid, filters, form submit
  data/
    apps.json         # Apps list (edit to add/change apps)
  assets/
    logo.svg          # VP monogram + wordmark
    favicon.svg       # Favicon (monogram)
    social-card.svg   # OG design placeholder (add social-card.png 1200×630 for best OG support)
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

5. **Custom domain (optional)**
   - In the Pages project → **Custom domains** → add your domain and follow DNS instructions.

---

## Form and spam protection setup

### Formspree (contact form)

1. Go to [formspree.io](https://formspree.io) and sign up or log in.
2. Create a new form. Formspree will give you an endpoint like `https://formspree.io/f/xyzabcde`.
3. In **contact.html**, find the form and replace `REPLACE_WITH_FORM_ID` with your form ID (e.g. `xyzabcde`):
   - In the form `action`: `action="https://formspree.io/f/REPLACE_WITH_FORM_ID"` → `action="https://formspree.io/f/xyzabcde"`.
4. Formspree will send submissions to your account email (set the destination email in Formspree to **vpathingenterprise@gmail.com**).

### Cloudflare Turnstile (spam protection)

1. In [Cloudflare Dashboard](https://dash.cloudflare.com), go to **Turnstile** (in the left sidebar under “Web3” or search “Turnstile”).
2. Click **Add site**. Enter your site name and domain (e.g. `your-site.pages.dev` or your custom domain). Choose a widget type (e.g. Managed).
3. Copy the **Site key**.
4. In **contact.html**, find the Turnstile widget and replace `REPLACE_WITH_TURNSTILE_SITE_KEY` with your site key:
   - `<div class="cf-turnstile" data-sitekey="REPLACE_WITH_TURNSTILE_SITE_KEY">` → paste your key.
5. **Secret key:** Cloudflare also gives you a **Secret key**. Do not put it in HTML. For server-side verification (recommended), you would verify the Turnstile token on a server or serverless function. Formspree does not verify Turnstile by default; you can use a [Formspree webhook](https://help.formspree.io/hc/en-us/articles/1500003018642-Webhooks) or another backend to verify the token using the secret. See [Cloudflare Turnstile server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/). The form will still work without server-side verification; Turnstile will block many bots on the client side.

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

## SEO and social

- Meta title and description are set on every page.
- **index.html** includes Open Graph meta tags. Add **assets/social-card.png** (1200×630 px) for social previews; the repo includes **assets/social-card.svg** as a design placeholder (you can export a PNG from it or create your own).

---

## Sitemap

Cloudflare Pages serves static files only; there is no sitemap generator in this repo. For SEO you can:

- Add a static **sitemap.xml** in the project root listing your pages (e.g. `/`, `/apps.html`, `/about.html`, `/contact.html`), or
- Use a sitemap generator or Cloudflare app later and point it at your live URL.

---

## Tech summary

- **Stack:** HTML, CSS, JavaScript only. No frameworks, no build step.
- **Hosting:** Cloudflare Pages (GitHub → Pages, build command blank, output directory `/`).
- **Form:** Formspree (form ID in `contact.html`).
- **Spam:** Cloudflare Turnstile (site key in `contact.html`; secret key for optional server-side verification).

All set for a clean, professional, mobile-friendly static site you can push to GitHub and deploy to Cloudflare Pages.
