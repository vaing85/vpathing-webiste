// Pathing MDM — server entrypoint.
// Serves the admin dashboard (static) + the admin API + the device API.
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './db.js';
import { ensureSeedAdmin } from './auth.js';
import { adminRouter } from './routes/admin.js';
import { deviceRouter } from './routes/device.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4000;

const app = express();
app.use(express.json({ limit: '256kb' }));

// APIs
app.use('/api/admin', adminRouter);
app.use('/api/device', deviceRouter);
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// Static admin dashboard
app.use(express.static(path.join(__dirname, '..', 'public')));

// Initialize storage + seed admin.
db();
const seeded = ensureSeedAdmin();

app.listen(PORT, () => {
  console.log(`\n  Pathing MDM running → http://localhost:${PORT}`);
  if (seeded) {
    console.log('\n  First-run admin account created:');
    console.log(`    email:    ${seeded.email}`);
    console.log(`    password: ${seeded.password}${seeded.generated ? '  (default — change it!)' : ''}`);
  }
  console.log('');
});
