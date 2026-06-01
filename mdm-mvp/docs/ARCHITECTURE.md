# Pathing MDM — Architecture & real-device roadmap

This MVP implements the **platform-neutral core** of an MDM: enrollment,
inventory, a command queue, and policy assignment, exercised end-to-end by a
device simulator. This doc explains how to take each platform from "simulated"
to "real device," what it costs, and in what order to build it.

## The core loop (already built)

```
        ┌────────────┐        enroll / checkin / result        ┌──────────────┐
        │  Device    │  ───────────────────────────────────▶   │  Pathing MDM │
        │  agent     │  ◀───  commands + active policy  ─────   │   server     │
        └────────────┘                                          └──────┬───────┘
                                                                       │ admin API
                                                                ┌──────▼───────┐
                                                                │  Dashboard   │
                                                                └──────────────┘
```

The server is platform-agnostic. "Supporting a platform" means providing a real
**agent** (and, for instant actions, a **push channel** to wake it).

---

## Android — start here (lowest cost, highest leverage)

**Recommended approach: Google's [Android Management API](https://developers.google.com/android/management) (AMAPI).**

You do **not** build an Android agent. Google ships *Android Device Policy* (the
on-device agent) and runs the enrollment/push infrastructure. You call a REST
API to:

- Create an **enterprise** (binds your MDM to a Google account / Managed Google Play).
- Generate **enrollment tokens** → rendered as the QR code shown at device setup.
- Define **policies** (Google's policy schema maps closely to ours: password
  rules, camera, kiosk/"dedicated device", app allow-lists, etc.).
- Issue **commands** (`LOCK`, `RESET_PASSWORD`, `WIPE`, `REBOOT`).

**Integration points in this codebase:**
- `routes/admin.js` policy + command handlers → translate our policy/command
  shapes into AMAPI `policies.patch` / `devices.issueCommand` calls.
- `routes/device.js` is bypassed for Android (Google relays device state via
  Pub/Sub notifications) — add a webhook that updates our `devices` records.

**Cost:** Free API. Requires a Google Cloud project + a Managed Google Play
enrollment (one-time, free). This is the cheapest way to ship a credible MDM.

**Effort:** ~1–2 weeks for a working vertical.

---

## iOS / iPadOS — the protocol path

Apple does **not** offer a "do it for me" API equivalent to AMAPI. You implement
**Apple's MDM protocol** directly:

1. **Apple Push Notification service (APNs) certificate** — obtain an *MDM Push
   Certificate* via the [Apple Push Certificates Portal](https://identity.apple.com)
   (needs an MDM vendor cert; in practice a paid **Apple Developer Program**
   membership, $99/yr, and for the vendor cert the **Apple Developer Enterprise**
   path or a partner CSR).
2. **Enrollment** — serve a signed `.mobileconfig` enrollment profile. For
   company-owned devices, integrate **Apple Business Manager** (ABM) +
   Automated Device Enrollment (ADE/DEP) so devices auto-enroll on setup.
3. **Server endpoints** — implement the MDM `CheckIn` (Authenticate /
   TokenUpdate) and the command/response loop (Apple sends signed plist
   payloads; you reply with commands like `DeviceLock`, `EraseDevice`,
   `InstallProfile`, `InstallApplication`).
4. **Push wake-up** — send an APNs push (just a "magic" wake) and the device
   connects back to pull queued commands.

**Maps onto this codebase:** our `checkin`/`command-result` loop becomes the
Apple plist endpoints; our command types map to Apple MDM commands; add an APNs
sender to wake devices instead of relying on polling.

**Cost:** Apple Developer Program ($99/yr) + an APNs MDM cert. TLS with a
publicly trusted cert is mandatory.

**Effort:** ~3–5 weeks (protocol + profile signing + ABM). The heaviest platform.

---

## Windows — the built-in MDM client

Windows 10/11 ship an MDM client; you implement the **MDM enrollment + OMA-DM**
protocol and drive device settings via **Configuration Service Providers (CSPs)**.

1. **Enrollment** — support the MS-MDE/MS-MDM enrollment flow (discovery →
   provisioning). Azure AD-joined devices can auto-enroll; standalone devices
   enroll via *Settings → Access work or school*.
2. **Management** — exchange **SyncML/OMA-DM** messages; set policies and run
   actions through CSPs (e.g. `DeviceLock`, `RemoteWipe`, `Policy`, `EnterpriseDesktopAppManagement`).
3. **Push wake-up** — use **WNS** (Windows Notification Service) to trigger an
   immediate sync, like APNs/FCM elsewhere.

**Maps onto this codebase:** add a SyncML endpoint alongside `routes/device.js`;
translate our policies/commands into CSP nodes.

**Cost:** WNS registration (free, via a Microsoft Partner/Entra app). A publicly
trusted TLS cert is required. No per-seat fee from Microsoft.

**Effort:** ~3–4 weeks.

---

## Suggested build order & rough budget

| Phase | Scope | External cost | Time |
|-------|-------|---------------|------|
| 0 (done) | Core server, dashboard, policies, simulator | $0 | — |
| 1 | **Android via AMAPI** — first real fleet | $0 (GCP free tier) | 1–2 wk |
| 2 | Harden: Postgres (Supabase), HTTPS, multi-tenant orgs, audit log | ~$0–25/mo | 1–2 wk |
| 3 | **Windows** via OMA-DM + WNS | $0 | 3–4 wk |
| 4 | **iOS** via Apple MDM + APNs + ABM | $99/yr | 3–5 wk |
| 5 | Billing, onboarding, app catalog, reporting | Stripe fees | ongoing |

## What to harden before charging customers

- **Multi-tenancy**: scope every record to an `orgId`; today it's single-tenant.
- **Database**: move `db.js` to Postgres; the call sites are already isolated.
- **Transport**: HTTPS everywhere; device secrets and tokens are bearer creds.
- **Audit log**: who issued which command to which device, when.
- **Push, not poll**: FCM/APNs/WNS so actions like "wipe" are near-instant.
- **Compliance**: privacy policy + data handling; MDM touches sensitive data.

## Competitive context (small-market positioning)

Existing small-business MDMs (Hexnode, Scalefusion, Miradore, Esper, Jamf Now)
typically charge **~$1–4 per device/month**. A self-hostable, flat-rate or
low-per-seat offering — built on AMAPI for Android first — is a credible wedge
for solo IT admins and very small fleets that find per-seat pricing painful.
