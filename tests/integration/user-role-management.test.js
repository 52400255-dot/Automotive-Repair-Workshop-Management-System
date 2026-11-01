/** Integration coverage for US18/US19 role-management API using PostgreSQL. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { createRoleManagementFixtures } = require('../helpers/roleManagementFixtures');
const { ROOT } = require('../helpers/testEnv');

const BACKEND = path.join(ROOT, 'backend');
const PORT = Number(process.env.ROLE_TEST_PORT || 3114);
const BASE = `http://127.0.0.1:${PORT}/api/v1`;
const SECRET = 'role_management_integration_test_secret';

async function api(url, { method = 'GET', token, body } = {}) {
  const response = await fetch(BASE + url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try { json = await response.json(); } catch { /* Keep non-JSON responses inspectable by status. */ }
  return { status: response.status, json };
}

async function waitUntilUp(server) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error(`Backend exited before becoming ready (code ${server.exitCode})`);
    }
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}/api/health`);
      if (response.ok) return;
    } catch { /* The server is still starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Backend did not start on port ${PORT}`);
}

async function stopServer(server) {
  if (!server || server.exitCode !== null) return;
  await new Promise((resolve) => {
    const timer = setTimeout(() => {
      server.kill('SIGKILL');
      resolve();
    }, 3000);
    server.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
    server.kill();
  });
}

test('US17 — admin quản lý role qua API, người dùng thường bị chặn', async () => {
  let fixtures;
  let server;

  try {
    fixtures = await createRoleManagementFixtures();
    const dbConfig = fixtures.db.connectionParameters;
    server = spawn(process.execPath, [path.join(BACKEND, 'src', 'server.js')], {
      cwd: BACKEND,
      env: {
        ...process.env,
        PORT: String(PORT),
        DB_HOST: dbConfig.host,
        DB_PORT: String(dbConfig.port),
        DB_USER: dbConfig.user,
        DB_PASSWORD: dbConfig.password,
        DB_NAME: dbConfig.database,
        JWT_SECRET: SECRET,
      },
      stdio: 'ignore',
    });
    await waitUntilUp(server);

    const adminLogin = await api('/auth/login', {
      method: 'POST',
      body: { email: fixtures.adminEmail, password: fixtures.password },
    });
    assert.equal(adminLogin.status, 200);
    assert.equal(adminLogin.json.success, true);
    assert.equal(adminLogin.json.data.user.role, 'admin');
    assert.equal(Object.hasOwn(adminLogin.json.data.user, 'password_hash'), false);
    const adminToken = adminLogin.json.data.token;

    const list = await api('/users', { token: adminToken });
    assert.equal(list.status, 200);
    assert.equal(list.json.success, true);
    assert.ok(list.json.data.some((user) => Number(user.id) === Number(fixtures.targetId)));
    assert.ok(list.json.data.every((user) => !Object.hasOwn(user, 'password_hash')));

    const anonymousList = await api('/users');
    assert.equal(anonymousList.status, 401);

    const selfDemotion = await api(`/users/${adminLogin.json.data.user.id}/role`, {
      method: 'PATCH',
      token: adminToken,
      body: { role: 'receptionist' },
    });
    assert.equal(selfDemotion.status, 409, 'Admin không được tự hạ quyền quản trị của mình');

    const targetLogin = await api('/auth/login', {
      method: 'POST',
      body: { email: fixtures.targetEmail, password: fixtures.password },
    });
    assert.equal(targetLogin.status, 200);
    const regularToken = targetLogin.json.data.token;

    assert.equal((await api('/users', { token: regularToken })).status, 403);
    const forbiddenUpdate = await api(`/users/${fixtures.targetId}/role`, {
      method: 'PATCH',
      token: regularToken,
      body: { role: 'mechanic' },
    });
    assert.equal(forbiddenUpdate.status, 403);

    const invalidRole = await api(`/users/${fixtures.targetId}/role`, {
      method: 'PATCH',
      token: adminToken,
      body: { role: 'root' },
    });
    assert.equal(invalidRole.status, 400);

    const missingUser = await api('/users/999999999/role', {
      method: 'PATCH',
      token: adminToken,
      body: { role: 'mechanic' },
    });
    assert.equal(missingUser.status, 404);

    const updated = await api(`/users/${fixtures.targetId}/role`, {
      method: 'PATCH',
      token: adminToken,
      body: { role: 'mechanic' },
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.json.data.role, 'mechanic');
    assert.equal(Object.hasOwn(updated.json.data, 'password_hash'), false);

    const staleReceptionistAccess = await api('/customers', { token: regularToken });
    assert.equal(staleReceptionistAccess.status, 403, 'JWT cũ không được giữ quyền lễ tân sau khi đổi role');

    const promoteToAdmin = await api(`/users/${fixtures.targetId}/role`, {
      method: 'PATCH', token: adminToken, body: { role: 'admin' },
    });
    assert.equal(promoteToAdmin.status, 200);
    const elevatedLogin = await api('/auth/login', {
      method: 'POST',
      body: { email: fixtures.targetEmail, password: fixtures.password },
    });
    assert.equal(elevatedLogin.status, 200);
    assert.equal(elevatedLogin.json.data.user.role, 'admin');

    const demoteAgain = await api(`/users/${fixtures.targetId}/role`, {
      method: 'PATCH', token: adminToken, body: { role: 'receptionist' },
    });
    assert.equal(demoteAgain.status, 200);
    const staleAdminAccess = await api('/users', { token: elevatedLogin.json.data.token });
    assert.equal(staleAdminAccess.status, 403, 'JWT cũ không được giữ quyền admin sau khi bị hạ role');

    const restoreTargetRole = await api(`/users/${fixtures.targetId}/role`, {
      method: 'PATCH', token: adminToken, body: { role: 'mechanic' },
    });
    assert.equal(restoreTargetRole.status, 200);

    const persisted = await fixtures.db.query('SELECT role FROM users WHERE id = $1', [fixtures.targetId]);
    assert.equal(persisted.rows[0].role, 'mechanic');

    const promoteForConcurrency = await api(`/users/${fixtures.targetId}/role`, {
      method: 'PATCH', token: adminToken, body: { role: 'admin' },
    });
    assert.equal(promoteForConcurrency.status, 200);
    const secondAdminLogin = await api('/auth/login', {
      method: 'POST',
      body: { email: fixtures.targetEmail, password: fixtures.password },
    });
    assert.equal(secondAdminLogin.status, 200);

    const demotionResults = await Promise.all([
      api(`/users/${fixtures.targetId}/role`, {
        method: 'PATCH', token: adminToken, body: { role: 'receptionist' },
      }),
      api(`/users/${adminLogin.json.data.user.id}/role`, {
        method: 'PATCH', token: secondAdminLogin.json.data.token, body: { role: 'receptionist' },
      }),
    ]);
    assert.equal(demotionResults.filter((result) => result.status === 200).length, 1);
    assert.ok(demotionResults.every((result) => [200, 403, 409].includes(result.status)));
    const adminCount = await fixtures.db.query("SELECT count(*) FROM users WHERE role = 'admin'");
    assert.equal(Number(adminCount.rows[0].count), 1, 'Request đồng thời không được hạ quyền admin cuối cùng');
  } finally {
    await stopServer(server);
    if (fixtures) await fixtures.cleanup();
  }
});
