// Device-facing endpoints. These are what an on-device agent calls — they are
// authenticated with a per-device secret issued at enrollment, NOT the admin
// session. This is the platform-neutral core of the MDM: the same enroll /
// check-in / report loop works for Android, iOS and Windows agents.
import express from 'express';
import crypto from 'node:crypto';
import { db, save, id } from '../db.js';

export const deviceRouter = express.Router();

function findDeviceAuth(req) {
  const { deviceId, deviceSecret } = req.body || {};
  if (!deviceId || !deviceSecret) return null;
  const device = db().devices.find((d) => d.id === deviceId);
  if (!device) return null;
  const a = Buffer.from(device.secret);
  const b = Buffer.from(String(deviceSecret));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return device;
}

// 1. Enrollment: a device redeems a one-time token and registers itself.
deviceRouter.post('/enroll', (req, res) => {
  const { token, deviceInfo = {} } = req.body || {};
  const d = db();
  const enrollment = d.enrollmentTokens.find((t) => t.token === token);
  if (!enrollment) return res.status(404).json({ error: 'invalid_token' });
  if (enrollment.used) return res.status(409).json({ error: 'token_already_used' });

  const secret = crypto.randomBytes(24).toString('base64url');
  const device = {
    id: id('dev'),
    secret,
    name: deviceInfo.name || `${deviceInfo.manufacturer || ''} ${deviceInfo.model || 'Device'}`.trim(),
    platform: enrollment.platform,
    model: deviceInfo.model || 'Unknown',
    manufacturer: deviceInfo.manufacturer || 'Unknown',
    osVersion: deviceInfo.osVersion || 'Unknown',
    serial: deviceInfo.serial || null,
    enrolledAt: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    status: 'active',
    battery: deviceInfo.battery ?? null,
    policyId: enrollment.policyId || null,
    info: deviceInfo,
  };
  d.devices.push(device);
  enrollment.used = true;
  enrollment.deviceId = device.id;
  enrollment.usedAt = new Date().toISOString();
  save();

  return res.json({ deviceId: device.id, deviceSecret: secret, policyId: device.policyId });
});

// 2. Check-in: the agent polls for pending commands and reports current state.
deviceRouter.post('/checkin', (req, res) => {
  const device = findDeviceAuth(req);
  if (!device) return res.status(401).json({ error: 'unauthorized' });

  const { status = {} } = req.body || {};
  device.lastSeen = new Date().toISOString();
  if (typeof status.battery === 'number') device.battery = status.battery;
  if (status.osVersion) device.osVersion = status.osVersion;
  if (status.state && device.status !== 'wiped') device.status = status.state;

  const d = db();
  const pending = d.commands.filter((c) => c.deviceId === device.id && c.status === 'pending');
  for (const c of pending) {
    c.status = 'sent';
    c.sentAt = new Date().toISOString();
  }
  const policy = device.policyId ? d.policies.find((p) => p.id === device.policyId) : null;
  save();

  return res.json({
    commands: pending.map((c) => ({ id: c.id, type: c.type, payload: c.payload })),
    policy: policy ? policyForDevice(policy) : null,
  });
});

// 3. Command result: the agent reports the outcome of an executed command.
deviceRouter.post('/command-result', (req, res) => {
  const device = findDeviceAuth(req);
  if (!device) return res.status(401).json({ error: 'unauthorized' });

  const { commandId, status, result } = req.body || {};
  const command = db().commands.find((c) => c.id === commandId && c.deviceId === device.id);
  if (!command) return res.status(404).json({ error: 'command_not_found' });

  command.status = status === 'success' ? 'done' : 'failed';
  command.result = result || null;
  command.completedAt = new Date().toISOString();

  // Reflect terminal device states driven by commands.
  if (command.type === 'wipe' && command.status === 'done') device.status = 'wiped';
  if (command.type === 'lock' && command.status === 'done') device.status = 'locked';
  save();

  return res.json({ ok: true });
});

// Shape a policy for delivery to a device (strip internal fields).
function policyForDevice(policy) {
  return {
    id: policy.id,
    name: policy.name,
    passwordRequired: policy.passwordRequired,
    minPasswordLength: policy.minPasswordLength,
    cameraDisabled: policy.cameraDisabled,
    kioskApp: policy.kioskApp,
    allowedApps: policy.allowedApps,
  };
}
