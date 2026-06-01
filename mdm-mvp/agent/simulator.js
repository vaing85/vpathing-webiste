// Device simulator — pretends to be an enrolled phone/laptop so you can see
// the full MDM loop (enroll → check-in → receive commands → report results)
// without real hardware.
//
// Usage:
//   node agent/simulator.js <enrollmentToken> [--server http://localhost:4000]
//
// Get an enrollment token from the dashboard (Enroll tab) or the API.
const args = process.argv.slice(2);
const token = args.find((a) => !a.startsWith('--'));
const server = getFlag('--server') || process.env.MDM_SERVER || 'http://localhost:4000';

if (!token) {
  console.error('Usage: node agent/simulator.js <enrollmentToken> [--server URL]');
  process.exit(1);
}

const PROFILES = {
  android: { manufacturer: 'Google', model: 'Pixel 7', osVersion: 'Android 14' },
  ios: { manufacturer: 'Apple', model: 'iPhone 14', osVersion: 'iOS 17.4' },
  windows: { manufacturer: 'Dell', model: 'Latitude 5440', osVersion: 'Windows 11 23H2' },
};

let device = null;
let battery = 87;
let appliedPolicy = null;

async function api(pathname, body) {
  const res = await fetch(`${server}${pathname}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${pathname} → ${res.status} ${JSON.stringify(data)}`);
  return data;
}

async function enroll() {
  // We don't know the platform until the server tells us via policy, so guess
  // from the token's intent by trying android profile; the server records the
  // real platform from the token regardless of what we send.
  const guess = PROFILES.android;
  const info = {
    ...guess,
    name: `${guess.model} (simulated)`,
    serial: 'SIM-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
    battery,
  };
  const result = await api('/api/device/enroll', { token, deviceInfo: info });
  device = result;
  console.log(`✓ Enrolled. deviceId=${device.deviceId}`);
  console.log('  Watching for commands... (Ctrl+C to stop)\n');
}

function execute(command) {
  console.log(`→ Command received: ${command.type}`, command.payload || '');
  switch (command.type) {
    case 'lock':
      return { status: 'success', result: { locked: true } };
    case 'unlock':
      return { status: 'success', result: { locked: false } };
    case 'message':
      console.log(`   📢 MESSAGE TO USER: "${command.payload?.text || ''}"`);
      return { status: 'success' };
    case 'wipe':
      console.log('   ⚠️  DEVICE WIPED — factory reset simulated. Exiting agent.');
      setTimeout(() => process.exit(0), 500);
      return { status: 'success', result: { wiped: true } };
    case 'install_app':
      console.log(`   📦 Installing app: ${command.payload?.package || command.payload?.url || '?'}`);
      return { status: 'success' };
    case 'reboot':
      console.log('   🔄 Rebooting (simulated)...');
      return { status: 'success' };
    case 'refresh':
      return { status: 'success', result: report() };
    default:
      return { status: 'failed', result: { error: 'unsupported' } };
  }
}

function report() {
  battery = Math.max(1, battery - Math.floor(Math.random() * 3));
  return { battery, osVersion: PROFILES.android.osVersion, state: 'active' };
}

async function checkin() {
  try {
    const { commands, policy } = await api('/api/device/checkin', {
      deviceId: device.deviceId,
      deviceSecret: device.deviceSecret,
      status: report(),
    });
    if (policy && JSON.stringify(policy) !== JSON.stringify(appliedPolicy)) {
      appliedPolicy = policy;
      console.log(`⚙  Policy applied: "${policy.name}" ` +
        `(password=${policy.passwordRequired ? policy.minPasswordLength + '+ chars' : 'off'}, ` +
        `camera=${policy.cameraDisabled ? 'disabled' : 'on'}` +
        `${policy.kioskApp ? ', kiosk=' + policy.kioskApp : ''})`);
    }
    for (const command of commands) {
      const outcome = execute(command);
      await api('/api/device/command-result', {
        deviceId: device.deviceId,
        deviceSecret: device.deviceSecret,
        commandId: command.id,
        status: outcome.status,
        result: outcome.result,
      });
    }
  } catch (err) {
    console.error('checkin error:', err.message);
  }
}

function getFlag(name) {
  const i = args.indexOf(name);
  return i !== -1 ? args[i + 1] : null;
}

await enroll();
setInterval(checkin, 5000);
checkin();
