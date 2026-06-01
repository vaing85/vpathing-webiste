# Pathing MDM

A lightweight, **self-hostable Mobile Device Management** MVP by VPathing Enterprise LLC.

> Goal: a price-competitive MDM for solo operators and small businesses. This
> repo is the **working core** — enrollment, inventory, remote commands, and
> policies — plus a device simulator so you can see the whole thing run today,
> with no phones and no cloud accounts.

## What works right now

- **Admin dashboard** (web) — login, fleet overview, device detail, policies, enrollment.
- **Device enrollment** via one-time tokens (per platform, optional policy).
- **Live inventory** — model, OS, battery, last-seen, online/offline.
- **Remote commands** — lock, unlock, reboot, message, install app, **wipe**.
- **Policies** — password rules, camera disable, kiosk mode, app allow-lists.
- **Device simulator** — emulates an Android/iOS/Windows device checking in.

It runs on **just Node + Express** (one dependency) with a JSON-file data store —
nothing to provision. Swap the store for Postgres (e.g. Supabase) when you scale.

## Quick start

```bash
cd mdm-mvp
npm install
npm start
```

Open http://localhost:4000. On first run a default admin is printed in the console:

```
email:    admin@local
password: admin1234   (override with MDM_ADMIN_EMAIL / MDM_ADMIN_PASSWORD)
```

### See the full loop in 60 seconds

1. Sign in to the dashboard.
2. **Policies → New policy** — create one (e.g. require a 6-char password).
3. **Enroll** — pick a platform, optionally attach the policy, **Generate token**.
4. Copy the printed command and run the simulator in a second terminal:
   ```bash
   node agent/simulator.js <enrollmentToken>
   ```
5. Back in **Devices**, the simulated device appears online. Open it and hit
   **Lock**, **Message**, or **Wipe** — watch the simulator react in its terminal.

## How it's structured

```
mdm-mvp/
  server/
    index.js          # Express app: serves dashboard + APIs
    db.js             # JSON-file persistence (swap for Postgres later)
    auth.js           # scrypt passwords + HMAC session tokens
    routes/
      admin.js        # dashboard API (auth-guarded)
      device.js       # device API: enroll / checkin / command-result
  public/             # admin dashboard (vanilla HTML/CSS/JS)
  agent/
    simulator.js      # fake device for end-to-end testing
  docs/
    ARCHITECTURE.md   # real Android / iOS / Windows integration path
```

## The device protocol (platform-neutral core)

Every real agent — Android, iOS, Windows — speaks the same three calls:

| Step | Endpoint | Purpose |
|------|----------|---------|
| Enroll | `POST /api/device/enroll` | Redeem a token, receive `deviceId` + `deviceSecret`. |
| Check-in | `POST /api/device/checkin` | Report state; receive pending commands + active policy. |
| Report | `POST /api/device/command-result` | Report command outcome. |

This poll-based loop is the simplest thing that works everywhere. Production
systems add **push wake-ups** (APNs for iOS, FCM for Android, WNS for Windows)
so devices act instantly instead of waiting for the next poll — see the docs.

## Going to real devices

See **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** for the concrete path on
each platform, what certificates/accounts you need, and a phased roadmap with
rough cost notes for a small-market launch.

## Security notes (MVP — read before any real use)

- The JSON store is plaintext on disk; fine for a demo, **not** for production.
- Serve only over **HTTPS** in production (tokens and secrets travel in requests).
- Change the default admin password immediately.
- Rotate `data/db.json`'s generated signing secret if it's ever exposed.
