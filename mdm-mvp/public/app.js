// Pathing MDM dashboard — vanilla JS single-page admin.
const TOKEN_KEY = 'pathing_mdm_token';
let token = localStorage.getItem(TOKEN_KEY);
let currentPage = 'dashboard';

const $ = (sel) => document.querySelector(sel);
const main = $('#main');

async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api/admin${path}`, {
    method,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) { logout(); throw new Error('unauthorized'); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `error ${res.status}`);
  return data;
}

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ago = (iso) => {
  if (!iso) return 'never';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

// ---- Auth ----
function showApp() {
  $('#login-view').classList.add('hidden');
  $('#app-view').classList.add('active');
  navigate(currentPage);
}
function logout() {
  localStorage.removeItem(TOKEN_KEY);
  token = null;
  $('#app-view').classList.remove('active');
  $('#login-view').classList.remove('hidden');
}

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#login-error').textContent = '';
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: $('#email').value, password: $('#password').value }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'login failed');
    token = data.token;
    localStorage.setItem(TOKEN_KEY, token);
    showApp();
  } catch (err) {
    $('#login-error').textContent = err.message === 'invalid_credentials' ? 'Invalid email or password.' : err.message;
  }
});

$('#logout').addEventListener('click', logout);
document.querySelectorAll('.nav-item[data-page]').forEach((el) => {
  el.addEventListener('click', () => navigate(el.dataset.page));
});

function navigate(page) {
  currentPage = page;
  document.querySelectorAll('.nav-item[data-page]').forEach((el) => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  ({ dashboard: renderDashboard, devices: renderDevices, policies: renderPolicies, enroll: renderEnroll }[page] || renderDashboard)();
}

// ---- Dashboard ----
async function renderDashboard() {
  main.innerHTML = '<h1 class="page-title">Dashboard</h1><div id="stats">Loading…</div>';
  const s = await api('/summary');
  const platforms = Object.entries(s.byPlatform).map(([p, n]) => `<span class="badge ${p}">${esc(p)} ${n}</span>`).join(' ') || '<span class="muted">none</span>';
  $('#stats').innerHTML = `
    <div class="stat-grid">
      ${stat(s.devices, 'Devices')}
      ${stat(s.online, 'Online now')}
      ${stat(s.policies, 'Policies')}
      ${stat(s.pendingCommands, 'Pending commands')}
    </div>
    <div class="card"><h3 class="mb">Fleet by platform</h3><div class="row">${platforms}</div></div>`;
}
const stat = (num, lbl) => `<div class="card stat"><div class="num">${num}</div><div class="lbl">${lbl}</div></div>`;

// ---- Devices ----
async function renderDevices() {
  main.innerHTML = '<h1 class="page-title">Devices</h1><div id="list">Loading…</div>';
  const devices = await api('/devices');
  if (!devices.length) {
    $('#list').innerHTML = '<div class="card empty">No devices enrolled yet. Go to <b>Enroll</b> to create a token, then run the simulator.</div>';
    return;
  }
  $('#list').innerHTML = `<div class="card"><table>
    <thead><tr><th>Name</th><th>Platform</th><th>OS</th><th>Battery</th><th>Status</th><th>Last seen</th></tr></thead>
    <tbody>${devices.map(deviceRow).join('')}</tbody></table></div>`;
  document.querySelectorAll('tr[data-id]').forEach((tr) => tr.addEventListener('click', () => renderDeviceDetail(tr.dataset.id)));
}

function deviceRow(d) {
  const status = d.status === 'wiped' ? 'wiped' : d.status === 'locked' ? 'locked' : (d.online ? 'online' : 'offline');
  const statusLabel = d.status === 'wiped' ? 'Wiped' : d.status === 'locked' ? 'Locked' : (d.online ? 'Online' : 'Offline');
  return `<tr class="clickable" data-id="${d.id}">
    <td><b>${esc(d.name)}</b></td>
    <td><span class="badge ${d.platform}">${esc(d.platform)}</span></td>
    <td>${esc(d.osVersion)}</td>
    <td>${d.battery != null ? d.battery + '%' : '—'}</td>
    <td><span class="badge ${status}">${statusLabel}</span></td>
    <td class="muted">${ago(d.lastSeen)}</td>
  </tr>`;
}

async function renderDeviceDetail(id) {
  main.innerHTML = 'Loading…';
  const [{ device, commands }, policies] = await Promise.all([api(`/devices/${id}`), api('/policies')]);
  const policyOpts = ['<option value="">— none —</option>', ...policies.map((p) =>
    `<option value="${p.id}" ${p.id === device.policyId ? 'selected' : ''}>${esc(p.name)}</option>`)].join('');

  main.innerHTML = `
    <div class="row between mb">
      <h1 class="page-title" style="margin:0">${esc(device.name)}</h1>
      <button class="small" id="back">← All devices</button>
    </div>
    <div class="card mb">
      <div class="row" style="gap:24px">
        <div><div class="lbl muted">Platform</div><span class="badge ${device.platform}">${esc(device.platform)}</span></div>
        <div><div class="lbl muted">Model</div>${esc(device.manufacturer)} ${esc(device.model)}</div>
        <div><div class="lbl muted">OS</div>${esc(device.osVersion)}</div>
        <div><div class="lbl muted">Battery</div>${device.battery != null ? device.battery + '%' : '—'}</div>
        <div><div class="lbl muted">Serial</div>${esc(device.serial || '—')}</div>
        <div><div class="lbl muted">Last seen</div>${ago(device.lastSeen)}</div>
        <div><div class="lbl muted">Enrolled</div>${ago(device.enrolledAt)}</div>
      </div>
    </div>

    <div class="card mb">
      <h3>Remote actions</h3>
      <div class="cmd-bar">
        <button data-cmd="lock">🔒 Lock</button>
        <button data-cmd="unlock">🔓 Unlock</button>
        <button data-cmd="reboot">🔄 Reboot</button>
        <button data-cmd="message">📢 Message</button>
        <button data-cmd="install_app">📦 Install app</button>
        <button class="danger" data-cmd="wipe">🗑 Wipe</button>
      </div>
      <div class="row" style="max-width:420px"><label style="margin:0;flex:1">Assigned policy
        <select id="policy-select">${policyOpts}</select></label></div>
    </div>

    <div class="card">
      <h3 class="mb">Command history</h3>
      ${commands.length ? `<table><thead><tr><th>Type</th><th>Status</th><th>Issued</th><th>Completed</th></tr></thead>
        <tbody>${commands.map((c) => `<tr>
          <td><b>${esc(c.type)}</b>${c.payload && Object.keys(c.payload).length ? ` <span class="muted">${esc(JSON.stringify(c.payload))}</span>` : ''}</td>
          <td><span class="badge ${c.status}">${c.status}</span></td>
          <td class="muted">${ago(c.createdAt)}</td>
          <td class="muted">${c.completedAt ? ago(c.completedAt) : '—'}</td></tr>`).join('')}</tbody></table>`
        : '<div class="empty">No commands sent yet.</div>'}
    </div>`;

  $('#back').addEventListener('click', () => navigate('devices'));
  $('#policy-select').addEventListener('change', async (e) => {
    await api(`/devices/${id}/policy`, { method: 'POST', body: { policyId: e.target.value || null } });
  });
  document.querySelectorAll('[data-cmd]').forEach((btn) => btn.addEventListener('click', async () => {
    const type = btn.dataset.cmd;
    let payload = {};
    if (type === 'message') { const text = prompt('Message to display on the device:'); if (text == null) return; payload = { text }; }
    if (type === 'install_app') { const pkg = prompt('App package / download URL:'); if (!pkg) return; payload = { package: pkg }; }
    if (type === 'wipe' && !confirm('Factory-wipe this device? This cannot be undone.')) return;
    await api(`/devices/${id}/commands`, { method: 'POST', body: { type, payload } });
    renderDeviceDetail(id);
  }));
}

// ---- Policies ----
async function renderPolicies() {
  main.innerHTML = '<div class="row between mb"><h1 class="page-title" style="margin:0">Policies</h1><button class="primary" id="new-policy">+ New policy</button></div><div id="plist">Loading…</div>';
  $('#new-policy').addEventListener('click', () => policyForm());
  const policies = await api('/policies');
  $('#plist').innerHTML = policies.length
    ? policies.map(policyCard).join('')
    : '<div class="card empty">No policies yet. Create one to enforce passwords, disable the camera, or set kiosk mode.</div>';
  document.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => policyForm(policies.find((p) => p.id === b.dataset.edit))));
  document.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
    if (confirm('Delete this policy?')) { await api(`/policies/${b.dataset.del}`, { method: 'DELETE' }); renderPolicies(); }
  }));
}

function policyCard(p) {
  const rules = [
    p.passwordRequired ? `Password (${p.minPasswordLength}+ chars)` : null,
    p.cameraDisabled ? 'Camera disabled' : null,
    p.kioskApp ? `Kiosk: ${p.kioskApp}` : null,
    p.allowedApps.length ? `${p.allowedApps.length} allowed apps` : null,
  ].filter(Boolean);
  return `<div class="card mb"><div class="row between">
    <div><h3>${esc(p.name)}</h3><div class="muted" style="margin-top:6px">${rules.map(esc).join(' · ') || 'No restrictions'}</div></div>
    <div class="row"><button class="small" data-edit="${p.id}">Edit</button><button class="small danger" data-del="${p.id}">Delete</button></div>
  </div></div>`;
}

function policyForm(p = null) {
  const isEdit = !!p;
  p = p || { name: '', passwordRequired: false, minPasswordLength: 6, cameraDisabled: false, kioskApp: '', allowedApps: [] };
  main.innerHTML = `
    <div class="row between mb"><h1 class="page-title" style="margin:0">${isEdit ? 'Edit' : 'New'} policy</h1><button class="small" id="cancel">← Back</button></div>
    <div class="card" style="max-width:520px">
      <label>Policy name</label><input id="p-name" value="${esc(p.name)}" placeholder="e.g. Standard staff phone">
      <label><input type="checkbox" id="p-pw" ${p.passwordRequired ? 'checked' : ''} style="width:auto"> Require device password</label>
      <label>Minimum password length</label><input id="p-pwlen" type="number" min="0" max="16" value="${p.minPasswordLength}">
      <label><input type="checkbox" id="p-cam" ${p.cameraDisabled ? 'checked' : ''} style="width:auto"> Disable camera</label>
      <label>Kiosk app (lock device to a single app — optional)</label><input id="p-kiosk" value="${esc(p.kioskApp || '')}" placeholder="com.example.app">
      <label>Allowed apps (comma-separated package names — optional)</label><input id="p-apps" value="${esc(p.allowedApps.join(', '))}">
      <div class="error" id="p-err"></div>
      <button class="primary" id="save" style="margin-top:16px">${isEdit ? 'Save changes' : 'Create policy'}</button>
    </div>`;
  $('#cancel').addEventListener('click', () => navigate('policies'));
  $('#save').addEventListener('click', async () => {
    const body = {
      name: $('#p-name').value.trim() || 'Untitled policy',
      passwordRequired: $('#p-pw').checked,
      minPasswordLength: Number($('#p-pwlen').value) || 0,
      cameraDisabled: $('#p-cam').checked,
      kioskApp: $('#p-kiosk').value.trim() || null,
      allowedApps: $('#p-apps').value.split(',').map((s) => s.trim()).filter(Boolean),
    };
    try {
      await api(isEdit ? `/policies/${p.id}` : '/policies', { method: isEdit ? 'PUT' : 'POST', body });
      navigate('policies');
    } catch (err) { $('#p-err').textContent = err.message; }
  });
}

// ---- Enroll ----
async function renderEnroll() {
  main.innerHTML = `<h1 class="page-title">Enroll a device</h1>
    <div class="card mb" style="max-width:520px">
      <label>Platform</label>
      <select id="e-platform"><option value="android">Android</option><option value="ios">iOS / iPadOS</option><option value="windows">Windows</option></select>
      <label>Apply policy (optional)</label><select id="e-policy"><option value="">— none —</option></select>
      <button class="primary" id="gen" style="margin-top:16px">Generate enrollment token</button>
    </div>
    <div id="token-out"></div>
    <h3 class="mb" style="margin-top:26px">Recent tokens</h3>
    <div id="tokens">Loading…</div>`;

  const policies = await api('/policies');
  $('#e-policy').innerHTML = '<option value="">— none —</option>' + policies.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('');

  $('#gen').addEventListener('click', async () => {
    const t = await api('/enrollment-tokens', { method: 'POST', body: { platform: $('#e-platform').value, policyId: $('#e-policy').value || null } });
    $('#token-out').innerHTML = `<div class="card mb" style="max-width:520px">
      <h3>Token created</h3>
      <p class="muted">Run the simulator to enroll a test device with this token:</p>
      <div class="token-box">node agent/simulator.js ${t.token}</div>
      <p class="muted" style="margin-top:10px">On a real device, this token is delivered via QR code during setup (see docs/ARCHITECTURE.md).</p>
    </div>`;
    loadTokens();
  });
  loadTokens();
}

async function loadTokens() {
  const tokens = await api('/enrollment-tokens');
  $('#tokens').innerHTML = tokens.length ? `<div class="card"><table>
    <thead><tr><th>Token</th><th>Platform</th><th>Status</th><th>Created</th></tr></thead>
    <tbody>${tokens.map((t) => `<tr>
      <td style="font-family:monospace">${esc(t.token.slice(0, 12))}…</td>
      <td><span class="badge ${t.platform}">${esc(t.platform)}</span></td>
      <td><span class="badge ${t.used ? 'done' : 'pending'}">${t.used ? 'used' : 'available'}</span></td>
      <td class="muted">${ago(t.createdAt)}</td></tr>`).join('')}</tbody></table></div>`
    : '<div class="card empty">No tokens generated yet.</div>';
}

// ---- Boot ----
if (token) showApp();
