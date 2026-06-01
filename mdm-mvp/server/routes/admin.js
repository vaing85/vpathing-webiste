// Admin-facing API consumed by the dashboard. All routes except /login are
// guarded by requireAdmin.
import express from 'express';
import crypto from 'node:crypto';
import { db, save, id } from '../db.js';
import { verifyPassword, issueToken, requireAdmin } from '../auth.js';

export const adminRouter = express.Router();

const COMMAND_TYPES = new Set(['lock', 'unlock', 'wipe', 'message', 'install_app', 'reboot', 'refresh']);

adminRouter.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  const admin = db().admins.find((a) => a.email === email);
  if (!admin || !verifyPassword(String(password || ''), admin.salt, admin.hash)) {
    return res.status(401).json({ error: 'invalid_credentials' });
  }
  return res.json({ token: issueToken(admin), email: admin.email });
});

adminRouter.use(requireAdmin);

// ---- Dashboard summary -----------------------------------------------------
adminRouter.get('/summary', (req, res) => {
  const d = db();
  const now = Date.now();
  const online = d.devices.filter((dev) => now - new Date(dev.lastSeen).getTime() < 90_000);
  res.json({
    devices: d.devices.length,
    online: online.length,
    policies: d.policies.length,
    pendingCommands: d.commands.filter((c) => c.status === 'pending' || c.status === 'sent').length,
    byPlatform: countBy(d.devices, 'platform'),
  });
});

// ---- Devices ---------------------------------------------------------------
adminRouter.get('/devices', (req, res) => {
  res.json(db().devices.map(publicDevice));
});

adminRouter.get('/devices/:id', (req, res) => {
  const d = db();
  const device = d.devices.find((x) => x.id === req.params.id);
  if (!device) return res.status(404).json({ error: 'not_found' });
  const commands = d.commands
    .filter((c) => c.deviceId === device.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ device: publicDevice(device), commands });
});

adminRouter.delete('/devices/:id', (req, res) => {
  const d = db();
  const idx = d.devices.findIndex((x) => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not_found' });
  d.devices.splice(idx, 1);
  d.commands = d.commands.filter((c) => c.deviceId !== req.params.id);
  save();
  res.json({ ok: true });
});

adminRouter.post('/devices/:id/policy', (req, res) => {
  const d = db();
  const device = d.devices.find((x) => x.id === req.params.id);
  if (!device) return res.status(404).json({ error: 'not_found' });
  const { policyId } = req.body || {};
  if (policyId && !d.policies.find((p) => p.id === policyId)) {
    return res.status(400).json({ error: 'invalid_policy' });
  }
  device.policyId = policyId || null;
  save();
  res.json(publicDevice(device));
});

// ---- Commands --------------------------------------------------------------
adminRouter.post('/devices/:id/commands', (req, res) => {
  const d = db();
  const device = d.devices.find((x) => x.id === req.params.id);
  if (!device) return res.status(404).json({ error: 'not_found' });
  const { type, payload = {} } = req.body || {};
  if (!COMMAND_TYPES.has(type)) return res.status(400).json({ error: 'invalid_command_type' });

  const command = {
    id: id('cmd'),
    deviceId: device.id,
    type,
    payload,
    status: 'pending',
    createdAt: new Date().toISOString(),
    issuedBy: req.admin.email,
  };
  d.commands.push(command);
  save();
  res.status(201).json(command);
});

// ---- Policies --------------------------------------------------------------
adminRouter.get('/policies', (req, res) => {
  res.json(db().policies);
});

adminRouter.post('/policies', (req, res) => {
  const d = db();
  const p = normalizePolicy(req.body || {});
  p.id = id('pol');
  p.createdAt = new Date().toISOString();
  d.policies.push(p);
  save();
  res.status(201).json(p);
});

adminRouter.put('/policies/:id', (req, res) => {
  const d = db();
  const existing = d.policies.find((p) => p.id === req.params.id);
  if (!existing) return res.status(404).json({ error: 'not_found' });
  Object.assign(existing, normalizePolicy(req.body || {}), { id: existing.id, createdAt: existing.createdAt });
  save();
  res.json(existing);
});

adminRouter.delete('/policies/:id', (req, res) => {
  const d = db();
  const idx = d.policies.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not_found' });
  d.policies.splice(idx, 1);
  for (const dev of d.devices) if (dev.policyId === req.params.id) dev.policyId = null;
  save();
  res.json({ ok: true });
});

// ---- Enrollment tokens -----------------------------------------------------
adminRouter.get('/enrollment-tokens', (req, res) => {
  res.json(db().enrollmentTokens.slice().reverse());
});

adminRouter.post('/enrollment-tokens', (req, res) => {
  const d = db();
  const { platform, policyId = null } = req.body || {};
  if (!['android', 'ios', 'windows'].includes(platform)) {
    return res.status(400).json({ error: 'invalid_platform' });
  }
  const token = {
    token: crypto.randomBytes(16).toString('hex'),
    platform,
    policyId,
    createdAt: new Date().toISOString(),
    used: false,
    deviceId: null,
  };
  d.enrollmentTokens.push(token);
  save();
  res.status(201).json(token);
});

// ---- helpers ---------------------------------------------------------------
function publicDevice(device) {
  const { secret, ...rest } = device;
  const online = Date.now() - new Date(device.lastSeen).getTime() < 90_000;
  return { ...rest, online };
}

function normalizePolicy(body) {
  return {
    name: String(body.name || 'Untitled policy').slice(0, 80),
    passwordRequired: Boolean(body.passwordRequired),
    minPasswordLength: Math.max(0, Math.min(16, Number(body.minPasswordLength) || 0)),
    cameraDisabled: Boolean(body.cameraDisabled),
    kioskApp: body.kioskApp ? String(body.kioskApp).slice(0, 120) : null,
    allowedApps: Array.isArray(body.allowedApps) ? body.allowedApps.map(String).slice(0, 100) : [],
  };
}

function countBy(arr, key) {
  return arr.reduce((acc, item) => {
    acc[item[key]] = (acc[item[key]] || 0) + 1;
    return acc;
  }, {});
}
