// Minimal zero-dependency JSON persistence layer.
// Good enough for an MVP / single-node deployment. Swap for Postgres
// (e.g. Supabase) when you outgrow a single file — the call sites only use
// the small API exposed at the bottom of this file.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const EMPTY = {
  meta: { secret: null },
  admins: [],
  devices: [],
  enrollmentTokens: [],
  commands: [],
  policies: [],
};

let state = null;

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function load() {
  ensureDir();
  if (fs.existsSync(DB_FILE)) {
    try {
      state = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch {
      state = structuredClone(EMPTY);
    }
  } else {
    state = structuredClone(EMPTY);
  }
  // Backfill any new collections added over time.
  for (const key of Object.keys(EMPTY)) {
    if (state[key] === undefined) state[key] = structuredClone(EMPTY[key]);
  }
  return state;
}

function persist() {
  ensureDir();
  fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2));
}

export function db() {
  if (!state) load();
  return state;
}

export function save() {
  persist();
}

// Stable id helper.
export function id(prefix = 'id') {
  return `${prefix}_${crypto.randomBytes(9).toString('base64url')}`;
}

// Returns (and persists) the server signing secret, generating it once.
export function signingSecret() {
  const d = db();
  if (!d.meta.secret) {
    d.meta.secret = crypto.randomBytes(32).toString('hex');
    save();
  }
  return d.meta.secret;
}
