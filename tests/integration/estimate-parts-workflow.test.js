/**
 * Integration test luồng tuần 4 qua HTTP API:
 * đăng nhập → tiếp nhận → phân công/chẩn đoán → báo giá/duyệt → sửa chữa
 * → trừ kho (kể cả trường hợp thiếu hàng) → hoàn tất.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { randomBytes } = require('node:crypto');

const { requireDep, requireTestDbConfig, ROOT } = require('../helpers/testEnv');

const { Client } = requireDep('pg');
const bcrypt = requireDep('bcryptjs');

const BACKEND = path.join(ROOT, 'backend');
const DB = requireTestDbConfig();
const PORT = Number(process.env.ESTIMATE_PARTS_TEST_PORT || 3113);
const BASE = `http://localhost:${PORT}/api/v1`;
const TEST_PASSWORD = `Week4-${randomBytes(18).toString('hex')}`;
const RUN_ID = `${Date.now()}-${process.pid}-${randomBytes(4).toString('hex')}`;

const serverEnv = {
  PORT: String(PORT),
  DB_HOST: DB.host,
  DB_PORT: String(DB.port),
  DB_USER: DB.user,
  DB_PASSWORD: DB.password,
  DB_NAME: DB.database,
  JWT_SECRET: `week4-integration-${randomBytes(32).toString('hex')}`,
};

let server;
let serverExit = null;
let db;
let dbConnected = false;
const fixtures = {
  userIds: [],
  customerId: null,
  vehicleId: null,
  jobId: null,
  partId: null,
  emails: {},
};
let tokens = {};

async function api(url, { method = 'GET', token, body } = {}) {
  const response = await fetch(BASE + url, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try { json = await response.json(); } catch { /* Response did not contain JSON. */ }
  return { status: response.status, json };
}

async function waitUntilUp() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (serverExit) {
      throw new Error(`Backend exited before becoming ready (code=${serverExit.code}, signal=${serverExit.signal})`);
    }
    try {
      const response = await fetch(`http://localhost:${PORT}/api/health`);
      if (response.ok) return;
    } catch { /* The server is still starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Backend server did not start on port ${PORT}`);
}

before(async () => {
  db = new Client(DB);
  await db.connect();
  dbConnected = true;

  const roles = [
    ['receptionist', 'receptionist'],
    ['mechanic', 'mechanic'],
    ['manager', 'service_manager'],
    ['customer', 'customer'],
  ];
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
  const users = {};
  for (const [key, role] of roles) {
    const email = `week4-${key}-${RUN_ID}@test.invalid`;
    fixtures.emails[key] = email;
    const result = await db.query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [`Week 4 ${key}`, email, passwordHash, role]
    );
    users[key] = result.rows[0].id;
    fixtures.userIds.push(result.rows[0].id);
  }

  const customer = await db.query(
    `INSERT INTO customers (user_id, full_name, phone, email)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [users.customer, 'Week 4 Customer', `09${String(Date.now()).slice(-8)}`, fixtures.emails.customer]
  );
  fixtures.customerId = customer.rows[0].id;

  const vehicle = await db.query(
    `INSERT INTO vehicles (customer_id, license_plate, brand, model, manufacture_year)
     VALUES ($1, $2, 'Toyota', 'Vios', 2022) RETURNING id`,
    [fixtures.customerId, `W4-${randomBytes(3).toString('hex').toUpperCase()}`]
  );
  fixtures.vehicleId = vehicle.rows[0].id;

  const part = await db.query(
    `INSERT INTO spare_parts (part_code, part_name, unit, stock_quantity, unit_price, min_stock)
     VALUES ($1, 'Week 4 integration test part', 'piece', 5, 125000, 1) RETURNING id`,
    [`W4-${RUN_ID}`]
  );
  fixtures.partId = part.rows[0].id;

  server = spawn(process.execPath, [path.join(BACKEND, 'src', 'server.js')], {
    cwd: BACKEND,
    env: { ...process.env, ...serverEnv },
    stdio: 'ignore',
  });
  server.on('exit', (code, signal) => { serverExit = { code, signal }; });
  await waitUntilUp();
});

after(async () => {
  if (server && server.exitCode === null) {
    server.kill();
    await new Promise((resolve) => {
      const timeout = setTimeout(resolve, 3000);
      server.once('exit', () => { clearTimeout(timeout); resolve(); });
    });
  }

  if (!db || !dbConnected) return;
  try {
    await db.query('BEGIN');
    if (fixtures.jobId) {
      await db.query('DELETE FROM payments WHERE invoice_id IN (SELECT id FROM invoices WHERE repair_job_id = $1)', [fixtures.jobId]);
      await db.query('DELETE FROM invoice_details WHERE invoice_id IN (SELECT id FROM invoices WHERE repair_job_id = $1)', [fixtures.jobId]);
      await db.query('DELETE FROM invoices WHERE repair_job_id = $1', [fixtures.jobId]);
      await db.query('DELETE FROM estimate_details WHERE estimate_id IN (SELECT id FROM estimates WHERE repair_job_id = $1)', [fixtures.jobId]);
      await db.query('DELETE FROM estimates WHERE repair_job_id = $1', [fixtures.jobId]);
      await db.query('DELETE FROM used_parts WHERE repair_job_id = $1', [fixtures.jobId]);
      await db.query('DELETE FROM diagnoses WHERE repair_job_id = $1', [fixtures.jobId]);
      await db.query('DELETE FROM mechanic_assignments WHERE repair_job_id = $1', [fixtures.jobId]);
      await db.query('DELETE FROM repair_tasks WHERE repair_job_id = $1', [fixtures.jobId]);
      await db.query('DELETE FROM repair_details WHERE repair_job_id = $1', [fixtures.jobId]);
      await db.query('DELETE FROM repair_jobs WHERE id = $1', [fixtures.jobId]);
    }
    if (fixtures.partId) {
      await db.query('DELETE FROM inventory_movements WHERE spare_part_id = $1', [fixtures.partId]);
      await db.query('DELETE FROM spare_parts WHERE id = $1', [fixtures.partId]);
    }
    if (fixtures.vehicleId) await db.query('DELETE FROM vehicles WHERE id = $1', [fixtures.vehicleId]);
    if (fixtures.customerId) await db.query('DELETE FROM customers WHERE id = $1', [fixtures.customerId]);
    if (fixtures.userIds.length) {
      await db.query('DELETE FROM users WHERE id = ANY($1::bigint[])', [fixtures.userIds]);
    }
    await db.query('COMMIT');
  } catch (error) {
    await db.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await db.end();
  }
});

test('US13/09/11 - báo giá, duyệt, trừ phụ tùng và hoàn tất phiếu qua API', async () => {
  // Bước 1: đăng nhập thực tế bằng tài khoản của bốn vai trò trong fixture.
  for (const role of ['receptionist', 'mechanic', 'manager', 'customer']) {
    const login = await api('/auth/login', {
      method: 'POST',
      body: { email: fixtures.emails[role], password: TEST_PASSWORD },
    });
    assert.equal(login.status, 200, `Đăng nhập vai trò ${role} phải thành công`);
    assert.ok(login.json?.data?.token, `Vai trò ${role} phải nhận được access token`);
    assert.equal(login.json.data.user.role, role === 'manager' ? 'service_manager' : role);
    tokens[role] = login.json.data.token;
  }

  // Tạo phiếu qua API, phân công qua quản lý và ghi chẩn đoán qua thợ máy.
  const createdJob = await api('/repair-jobs', {
    method: 'POST',
    token: tokens.receptionist,
    body: { vehicleId: Number(fixtures.vehicleId), customerRequest: 'Kiểm tra và sửa lỗi khởi động' },
  });
  assert.equal(createdJob.status, 201);
  fixtures.jobId = createdJob.json.data.id;
  assert.equal(createdJob.json.data.status, 'pending');

  const assigned = await api(`/repair-jobs/${fixtures.jobId}/assign`, {
    method: 'PUT',
    token: tokens.manager,
    body: { mechanicId: Number(fixtures.userIds[1]) },
  });
  assert.equal(assigned.status, 200);

  const diagnosis = await api(`/repair-jobs/${fixtures.jobId}/diagnosis`, {
    method: 'PUT',
    token: tokens.mechanic,
    body: { diagnosisResult: 'Bugi hỏng, cần thay một chiếc', repairSuggestion: 'Thay bugi mới' },
  });
  assert.equal(diagnosis.status, 201);

  const malformedEstimate = await api('/estimates', {
    method: 'POST', token: tokens.receptionist,
    body: { repairJobId: Number(fixtures.jobId), items: [] },
  });
  assert.equal(malformedEstimate.status, 400, 'Payload báo giá rỗng phải bị từ chối');
  const emptyEstimateCount = await db.query(
    'SELECT count(*)::int AS count FROM estimates WHERE repair_job_id = $1',
    [fixtures.jobId]
  );
  assert.equal(emptyEstimateCount.rows[0].count, 0, 'Payload lỗi không được tạo báo giá dở dang');

  // Bước 2: chỉ lễ tân lập được báo giá trên phiếu đang diagnosing.
  const deniedEstimate = await api('/estimates', {
    method: 'POST', token: tokens.manager,
    body: { repairJobId: Number(fixtures.jobId), items: [{
      itemType: 'part', description: 'Bugi', quantity: 1, unitPrice: 125000,
    }] },
  });
  assert.equal(deniedEstimate.status, 403, 'Quản lý không được gọi endpoint chỉ dành cho lễ tân');

  const estimate = await api('/estimates', {
    method: 'POST',
    token: tokens.receptionist,
    body: {
      repairJobId: Number(fixtures.jobId),
      items: [
        { itemType: 'labor', description: 'Công kiểm tra và thay thế', quantity: 1, unitPrice: 80000 },
        { itemType: 'part', description: 'Bugi', quantity: 1, unitPrice: 125000 },
      ],
    },
  });
  assert.equal(estimate.status, 201);
  assert.equal(Number(estimate.json.data.total_amount), 205000);
  assert.equal(estimate.json.data.details.length, 2);
  let job = await api(`/repair-jobs/${fixtures.jobId}`, { token: tokens.receptionist });
  assert.equal(job.json.data.status, 'estimated');

  // Bước 3: khách hàng liên kết với xe duyệt báo giá.
  const approval = await api(`/estimates/${estimate.json.data.id}/approve`, {
    method: 'PUT', token: tokens.customer,
  });
  assert.equal(approval.status, 200);
  assert.equal(approval.json.data.status, 'approved');
  job = await api(`/repair-jobs/${fixtures.jobId}`, { token: tokens.receptionist });
  assert.equal(job.json.data.status, 'approved');

  const earlyDeduction = await api(`/spare-parts/${fixtures.partId}/deduct`, {
    method: 'POST', token: tokens.mechanic,
    body: { repairJobId: Number(fixtures.jobId), quantity: 1 },
  });
  assert.equal(earlyDeduction.status, 409, 'Chưa bắt đầu sửa thì không được trừ kho');
  const stockBeforeRepair = await db.query('SELECT stock_quantity FROM spare_parts WHERE id = $1', [fixtures.partId]);
  assert.equal(Number(stockBeforeRepair.rows[0].stock_quantity), 5);

  // Bước 4: thợ bắt đầu sửa.
  const started = await api(`/repair-jobs/${fixtures.jobId}/status`, {
    method: 'PUT', token: tokens.mechanic, body: { status: 'in_repair' },
  });
  assert.equal(started.status, 200);
  assert.equal(started.json.data.status, 'in_repair');

  // Bước 5: trừ kho thành công, sau đó xác nhận không trừ quá tồn kho.
  const deduction = await api(`/spare-parts/${fixtures.partId}/deduct`, {
    method: 'POST', token: tokens.mechanic,
    body: { repairJobId: Number(fixtures.jobId), quantity: 2 },
  });
  assert.equal(deduction.status, 201);
  assert.equal(Number(deduction.json.data.quantity), 2);
  assert.equal(Number(deduction.json.data.unit_price_at_time), 125000);

  const stock = await db.query('SELECT stock_quantity FROM spare_parts WHERE id = $1', [fixtures.partId]);
  assert.equal(Number(stock.rows[0].stock_quantity), 3);
  const usedParts = await db.query(
    'SELECT quantity, unit_price_at_time FROM used_parts WHERE repair_job_id = $1 AND spare_part_id = $2',
    [fixtures.jobId, fixtures.partId]
  );
  assert.equal(usedParts.rowCount, 1);
  assert.equal(Number(usedParts.rows[0].quantity), 2);
  assert.equal(Number(usedParts.rows[0].unit_price_at_time), 125000);

  const oversubscription = await api(`/spare-parts/${fixtures.partId}/deduct`, {
    method: 'POST', token: tokens.mechanic,
    body: { repairJobId: Number(fixtures.jobId), quantity: 4 },
  });
  assert.equal(oversubscription.status, 409);
  const unchangedStock = await db.query('SELECT stock_quantity FROM spare_parts WHERE id = $1', [fixtures.partId]);
  assert.equal(Number(unchangedStock.rows[0].stock_quantity), 3);
  const unchangedUsedParts = await db.query(
    'SELECT count(*)::int AS count FROM used_parts WHERE repair_job_id = $1 AND spare_part_id = $2',
    [fixtures.jobId, fixtures.partId]
  );
  assert.equal(unchangedUsedParts.rows[0].count, 1);

  // Bước 6: hoàn tất và kiểm tra trạng thái cuối.
  const completed = await api(`/repair-jobs/${fixtures.jobId}/status`, {
    method: 'PUT', token: tokens.mechanic, body: { status: 'completed' },
  });
  assert.equal(completed.status, 200);
  assert.equal(completed.json.data.status, 'completed');
  assert.ok(completed.json.data.completed_at);
});
