# Repository protection

Steps to protect this repo on GitHub. Do these in **GitHub** → your repo → **Settings**.

---

## Quick: protect `main` (do this first)

1. Open your repo on GitHub → **Settings** (repo settings, not your profile).
2. In the left sidebar, click **Branches** (under "Code and automation").  
   - If you see **Rules** instead, click **Rules** → **Branch protection rules** or **Rulesets**.
3. Under **Branch protection rules**, click **Add rule** (or **Add branch protection rule**).
4. **Branch name pattern:** type `main` (or choose the branch you use as default).
5. Turn **on**:
   - **Do not allow force pushes** (or "Block force pushes") — prevents rewriting history.
   - **Do not allow deletions** (or leave "Allow branch deletion" **off**) — prevents deleting the `main` branch.
6. Leave **off** (unless you want them):
   - Require a pull request before merging  
   - Require status checks to pass  
7. Click **Create** (or **Save changes**).

Your `main` branch is now protected from force push and deletion.

---

## 1. Branch protection for `main` (detailed)

1. Go to **Settings** → **Branches** → **Branch protection rules** → **Add rule**.
2. **Branch name pattern:** `main`.
3. Enable:
   - **Do not allow force pushes** — **on**.
   - **Do not allow deletions** (or **Allow branch deletion** — **off**).
4. Optional: **Require a pull request before merging**, **Require status checks**, **Restrict who can push**.
5. Save.

---

## 2. Optional: GitHub Rulesets (fine-grained)

1. **Settings** → **Rules** → **Rulesets** → **New ruleset**.
2. **Name:** e.g. `Protect main`.
3. **Enforcement:** Active.
4. **Target:** Branches — include `main`.
5. Under **Rules**, add:
   - **Require pull request before merging** (optional).
   - **Require status checks** (if you use Actions).
   - **Block force pushes**.
   - **Restrict pushes** (optional).
6. Create ruleset.

---

## 3. What this protects

- **Force push to `main`** — blocked, so history isn’t rewritten by mistake.
- **Deletion of `main`** — blocked (if you enabled that).
- **Direct push to `main`** — optional; you can require all changes via pull requests and approvals.

---

## 4. One-person workflow

If you’re the only one pushing and want minimal friction, you can:

- **Do:** Enable **Block force pushes** and **Do not allow branch deletion** for `main`.
- **Skip:** Require pull requests and approvals.

That still protects the branch from accidental force push and deletion.
