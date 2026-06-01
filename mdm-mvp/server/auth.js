// Admin authentication: scrypt password hashing + stateless HMAC session
// tokens. No external dependencies.
import crypto from 'node:crypto';
import { db, save, id, signingSecret } from './db.js';

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

export function verifyPassword(password, salt, expectedHash) {
  const { hash } = hashPassword(password, salt);
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(expectedHash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Seed a default admin on first run so the app is usable immediately.
export function ensureSeedAdmin() {
  const d = db();
  if (d.admins.length > 0) return null;
  const email = process.env.MDM_ADMIN_EMAIL || 'admin@local';
  const password = process.env.MDM_ADMIN_PASSWORD || 'admin1234';
  const { salt, hash } = hashPassword(password);
  d.admins.push({ id: id('adm'), email, salt, hash });
  save();
  return { email, password, generated: !process.env.MDM_ADMIN_PASSWORD };
}

function b64url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

function sign(data) {
  return crypto.createHmac('sha256', signingSecret()).update(data).digest('base64url');
}

export function issueToken(admin, ttlSeconds = 60 * 60 * 12) {
  const payload = b64url({ sub: admin.id, email: admin.email, exp: Date.now() + ttlSeconds * 1000 });
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token) {
  if (!token || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (data.exp && data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

// Express middleware guarding admin routes.
export function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const data = verifyToken(token);
  if (!data) return res.status(401).json({ error: 'unauthorized' });
  req.admin = data;
  next();
}
