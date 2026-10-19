/**
 * repair-workflow.test.js — Integration test cho luồng Sprint 3 (US04, US06, US07, US08):
 * Tiếp nhận xe → Phân công thợ → Thợ xem việc → Ghi nhận chẩn đoán kỹ thuật.
 *
 * Chạy toàn bộ luồng: HTTP API + PostgreSQL.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawn } = require('node:child_process');

function requireBackendDep(name) {
  try {
    return require(name);
  } catch {
    return require(path.join(__dirname, '..', '..', 'backend', 'node_modules', name));
  }
}

const { Client } = requireBackendDep('pg');
const jwt = requireBackendDep('jsonwebtoken');

const ROOT = path.join(__dirname, '..', '..');
const BACKEND = path.join(ROOT, 'backend');

const DB = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'workshop_user',
  password: process.env.DB_PASSWORD || 'workshop_pass',
  database: process.env.DB_NAME || 'workshop_db',
};

const PORT = Number(process.env.TEST_PORT || 3112);
const BASE = `http://localhost:${PORT}/api/v1`;
const SECRET = 'workflow_integration_test_secret';

const token = (user) => jwt.sign(user, SECRET, { expiresIn: '1h' });

let server;
let db;
const fixtures = {
  receptionistId: null,
  mechanicAId: null,
  mechanicBId: null,
  managerId: null,
  customerId: null,
  vehicleId: null,
  serviceId: null,
  createdJobId: null,
};

let tokens = {};

async function api(url, { method = 'GET', tk, body } = {}) {
  const res = await fetch(BASE + url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(tk ? { Authorization: `Bearer ${tk}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* no json */ }
  return { status: res.status, json };
}

async function waitUntilUp() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://localhost:${PORT}/api/health`);
      if (res.ok) return;
    } catch { /* wait */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('Backend server did not start on port ' + PORT);
}

before(async () => {
  db = new Client(DB);
  await db.connect();

  server = spawn(process.execPath, [path.join(BACKEND, 'src', 'server.js')], {
    cwd: BACKEND,
    env: {
      ...process.env,
      PORT: String(PORT),
      DB_HOST: DB.host,
      DB_PORT: String(DB.port),
      DB_USER: DB.user,
      DB_PASSWORD: DB.password,
      DB_NAME: DB.database,
      JWT_SECRET: SECRET,
    },
    stdio: 'ignore',
  });
  await waitUntilUp();

  const mk = async (sql, params) => (await db.query(sql, params)).rows[0];

  // Tạo người dùng test
  fixtures.receptionistId = (await mk(
    `INSERT INTO users (full_name, email, password_hash, role)
     VALUES ('Sprint3 Receptionist', 'sp3.rec@test.com', 'hash', 'receptionist')
     RETURNING id`
  )).id;

  fixtures.mechanicAId = (await mk(
    `INSERT INTO users (full_name, email, password_hash, role)
     VALUES ('Sprint3 Mechanic A', 'sp3.meca@test.com', 'hash', 'mechanic')
     RETURNING id`
  )).id;

  fixtures.mechanicBId = (await mk(
    `INSERT INTO users (full_name, email, password_hash, role)
     VALUES ('Sprint3 Mechanic B', 'sp3.mecb@test.com', 'hash', 'mechanic')
     RETURNING id`
  )).id;

  fixtures.managerId = (await mk(
    `INSERT INTO users (full_name, email, password_hash, role)
     VALUES ('Sprint3 Manager', 'sp3.mgr@test.com', 'hash', 'service_manager')
     RETURNING id`
  )).id;

  // Tạo khách hàng + xe
  fixtures.customerId = (await mk(
    `INSERT INTO customers (full_name, phone, email)
     VALUES ('Sprint3 Customer', '0911223344', 'sp3.cust@test.com')
     RETURNING id`
  )).id;

  fixtures.vehicleId = (await mk(
    `INSERT INTO vehicles (customer_id, license_plate, brand, model, manufacture_year)
     VALUES ($1, 'SP3-999.99', 'Mazda', 'CX-5', 2024)
     RETURNING id`,
    [fixtures.customerId]
  )).id;

  // Tạo dịch vụ mẫu
  fixtures.serviceId = (await mk(
    `INSERT INTO services (service_code, service_name, standard_price)
     VALUES ('SP3-SVC-01', 'Kiem tra he thong dien', 180000)
     RETURNING id`
  )).id;

  // Tạo tokens
  tokens = {
    receptionist: token({ id: String(fixtures.receptionistId), role: 'receptionist', email: 'sp3.rec@test.com' }),
    mechanicA: token({ id: String(fixtures.mechanicAId), role: 'mechanic', email: 'sp3.meca@test.com' }),
    mechanicB: token({ id: String(fixtures.mechanicBId), role: 'mechanic', email: 'sp3.mecb@test.com' }),
    manager: token({ id: String(fixtures.managerId), role: 'service_manager', email: 'sp3.mgr@test.com' }),
  };
});

after(async () => {
  const safe = async (sql, params) => {
    try { await db.query(sql, params); } catch (err) { /* ignore cleanup error */ }
  };
  if (db) {
    if (fixtures.createdJobId) {
      await safe('DELETE FROM diagnoses WHERE repair_job_id = $1', [fixtures.createdJobId]);
      await safe('DELETE FROM mechanic_assignments WHERE repair_job_id = $1', [fixtures.createdJobId]);
      await safe('DELETE FROM repair_details WHERE repair_job_id = $1', [fixtures.createdJobId]);
      await safe('DELETE FROM repair_jobs WHERE id = $1', [fixtures.createdJobId]);
    }
    if (fixtures.serviceId) await safe('DELETE FROM services WHERE id = $1', [fixtures.serviceId]);
    if (fixtures.vehicleId) await safe('DELETE FROM vehicles WHERE id = $1', [fixtures.vehicleId]);
    if (fixtures.customerId) await safe('DELETE FROM customers WHERE id = $1', [fixtures.customerId]);
    const userIds = [fixtures.receptionistId, fixtures.mechanicAId, fixtures.mechanicBId, fixtures.managerId].filter(Boolean);
    if (userIds.length) await safe('DELETE FROM users WHERE id = ANY($1::bigint[])', [userIds]);
    await db.end();
  }
  if (server) server.kill();
});

// ----------------------------------------------------------------
// BƯỚC 1: TIẾP NHẬN XE & TẠO PHIẾU SỬA CHỮA (US04)
// ----------------------------------------------------------------
test('US04 - Le tan tiep nhan xe va tao phieu sua chua kem dich vu', async () => {
  const payload = {
    vehicleId: fixtures.vehicleId,
    customerRequest: 'Xe khoi dong cham, can kiem tra bugi va ac-quy',
    serviceItems: [{ serviceId: fixtures.serviceId, quantity: 1 }],
  };

  const res = await api('/repair-jobs', { method: 'POST', tk: tokens.receptionist, body: payload });
  assert.equal(res.status, 201, 'Tao phieu sua phai tra ve 201 Created');
  assert.ok(res.json.success, 'Response phai co success: true');
  assert.ok(res.json.data.id, 'Phieu phai co ID duoc sinh tu Database');
  assert.equal(res.json.data.status, 'pending', 'Trang thai ban dau phai la pending');
  assert.equal(res.json.data.license_plate, 'SP3-999.99');

  fixtures.createdJobId = res.json.data.id;

  // Kiem tra bang repair_details trong DB
  const details = await db.query('SELECT * FROM repair_details WHERE repair_job_id = $1', [fixtures.createdJobId]);
  assert.equal(details.rows.length, 1, 'Phai luu dung 1 dich vu vao repair_details');
  assert.equal(Number(details.rows[0].service_id), Number(fixtures.serviceId));
  assert.equal(Number(details.rows[0].unit_price_at_time), 180000);
});

// ----------------------------------------------------------------
// BƯỚC 2: PHÂN CÔNG THỢ MÁY (US07)
// ----------------------------------------------------------------
test('US07 - Lay danh sach tho may va phan cong tho may cho phieu', async () => {
  // 1. Lay danh sach tho may
  const mechanicsRes = await api('/repair-jobs/mechanics', { tk: tokens.receptionist });
  assert.equal(mechanicsRes.status, 200);
  assert.ok(Array.isArray(mechanicsRes.json.data));
  const hasMecA = mechanicsRes.json.data.some((m) => Number(m.id) === Number(fixtures.mechanicAId));
  assert.ok(hasMecA, 'Danh sach phai chua tho may A');

  // 2. Service Manager phan cong tho A cho phieu vua tao
  const assignRes = await api(`/repair-jobs/${fixtures.createdJobId}/assign`, {
    method: 'PUT',
    tk: tokens.manager,
    body: { mechanicId: fixtures.mechanicAId },
  });
  assert.equal(assignRes.status, 200, 'Phan cong tho phai tra ve 200 OK');

  // 3. Kiem tra trang thai phieu da chuyen thanh diagnosing
  const jobRes = await api(`/repair-jobs/${fixtures.createdJobId}`, { tk: tokens.receptionist });
  assert.equal(jobRes.status, 200);
  assert.equal(jobRes.json.data.status, 'diagnosing', 'Phieu phai chuyen sang trang thai diagnosing');
  assert.equal(jobRes.json.data.mechanic_name, 'Sprint3 Mechanic A', 'Tho may A phai duoc hien thi tren phieu');
});

// ----------------------------------------------------------------
// BƯỚC 3: THỢ MÁY XEM DANH SÁCH VIỆC ĐƯỢC PHÂN CÔNG (US08)
// ----------------------------------------------------------------
test('US08 - Tho may chi xem dung viec duoc phan cong cho minh', async () => {
  // Tho A goi my-jobs -> phai thay phieu
  const mecAJobs = await api('/repair-jobs/my-jobs', { tk: tokens.mechanicA });
  assert.equal(mecAJobs.status, 200);
  const foundA = mecAJobs.json.data.find((j) => Number(j.id) === Number(fixtures.createdJobId));
  assert.ok(foundA, 'Tho A phai thay phieu sua vua duoc giao');
  assert.equal(foundA.license_plate, 'SP3-999.99');

  // Tho B goi my-jobs -> KHONG duoc thay phieu cua tho A
  const mecBJobs = await api('/repair-jobs/my-jobs', { tk: tokens.mechanicB });
  assert.equal(mecBJobs.status, 200);
  const foundB = mecBJobs.json.data.find((j) => Number(j.id) === Number(fixtures.createdJobId));
  assert.ok(!foundB, 'Tho B khong duoc phep thay phieu cua tho A');
});

// ----------------------------------------------------------------
// BƯỚC 4: THỢ MÁY GHI NHẬN KẾT QUẢ CHẨN ĐOÁN (US06)
// ----------------------------------------------------------------
test('US06 - Tho may ghi nhan ket qua chan doan ky thuat', async () => {
  const diagPayload = {
    diagnosisResult: 'Bugi danh lua kem o xy lanh 2, ac-quy dien ap 11.8V can thay the',
    repairSuggestion: 'Thay 4 bugi danh lua va 1 binh ac-quy 60Ah',
  };

  const res = await api(`/repair-jobs/${fixtures.createdJobId}/diagnosis`, {
    method: 'PUT',
    tk: tokens.mechanicA,
    body: diagPayload,
  });

  assert.equal(res.status, 201, 'Ghi chan doan thanh cong phai tra ve 201 Created');
  assert.equal(res.json.data.diagnosis_result, diagPayload.diagnosisResult);

  // Kiem tra phieu khi doc lai co chua ket qua chan doan
  const jobRes = await api(`/repair-jobs/${fixtures.createdJobId}`, { tk: tokens.receptionist });
  assert.equal(jobRes.json.data.diagnosis_result, diagPayload.diagnosisResult);
  assert.equal(jobRes.json.data.repair_suggestion, diagPayload.repairSuggestion);

  // Kiem tra unauthorized: le tan khong the tu ghi chan doan (chi danh cho mechanic)
  const forbidden = await api(`/repair-jobs/${fixtures.createdJobId}/diagnosis`, {
    method: 'PUT',
    tk: tokens.receptionist,
    body: diagPayload,
  });
  assert.equal(forbidden.status, 403, 'Le tan gui chan doan phai bi chan 403 Forbidden');
});

// Regression cases intentionally follow the existing fixture workflow.
test('US04 - invalid service payload never leaves a partial job', async () => {
  const count = async () => Number((await db.query('SELECT count(*) FROM repair_jobs WHERE vehicle_id = $1', [fixtures.vehicleId])).rows[0].count);
  const beforeCount = await count();
  for (const [serviceItems, expected] of [[[{serviceId: fixtures.serviceId, quantity: 0}], 400],
    [[{serviceId: fixtures.serviceId, quantity: 1}, {serviceId: 9007199254740991, quantity: 1}], 404]]) {
    const res = await api('/repair-jobs', {method: 'POST', tk: tokens.receptionist,
      body: {vehicleId: fixtures.vehicleId, customerRequest: 'Regression', serviceItems}});
    assert.equal(res.status, expected);
    assert.equal(await count(), beforeCount);
  }
  // Also prove the stored function itself is atomic if a later service fails.
  await assert.rejects(db.query('SELECT create_repair_job_with_services($1,$2,$3,$4::jsonb)',
    [fixtures.vehicleId, fixtures.receptionistId, 'Rollback', JSON.stringify([
      {service_id: fixtures.serviceId, quantity: 1}, {service_id: 9007199254740991, quantity: 1}])]));
  assert.equal(await count(), beforeCount);
});

test('US07 - reject non-mechanics and preserve current assignment', async () => {
  const res = await api(`/repair-jobs/${fixtures.createdJobId}/assign`, {method: 'PUT', tk: tokens.manager,
    body: {mechanicId: fixtures.receptionistId}});
  assert.equal(res.status, 400);
  const job = await api(`/repair-jobs/${fixtures.createdJobId}`, {tk: tokens.manager});
  assert.equal(String(job.json.data.mechanic_id), String(fixtures.mechanicAId));
});

test('US07/06 - reassignment revokes old mechanic and preserves diagnosis history', async () => {
  const assign = await api('/repair-jobs/assign', {method: 'PUT', tk: tokens.manager,
    body: {repairJobId: fixtures.createdJobId, mechanicId: fixtures.mechanicBId}});
  assert.equal(assign.status, 200);
  const oldJobs = await api('/repair-jobs/my-jobs', {tk: tokens.mechanicA});
  assert.ok(!oldJobs.json.data.some(j => String(j.id) === String(fixtures.createdJobId)));
  const oldDiagnosis = await api(`/repair-jobs/${fixtures.createdJobId}/diagnosis`, {method: 'PUT', tk: tokens.mechanicA, body: {diagnosisResult: 'Not allowed'}});
  assert.equal(oldDiagnosis.status, 403);
  const oldStatus = await api(`/repair-jobs/${fixtures.createdJobId}/status`, {method: 'PUT', tk: tokens.mechanicA, body: {status: 'estimated'}});
  assert.equal(oldStatus.status, 403);
  const diagnosis = await api(`/repair-jobs/${fixtures.createdJobId}/diagnosis`, {method: 'PUT', tk: tokens.mechanicB, body: {diagnosisResult: ' Updated diagnosis '}});
  assert.equal(diagnosis.status, 201);
  const job = await api(`/repair-jobs/${fixtures.createdJobId}`, {tk: tokens.manager});
  assert.equal(job.json.data.diagnosis_result, 'Updated diagnosis');
  assert.equal(String(job.json.data.mechanic_id), String(fixtures.mechanicBId));
  assert.equal(Number((await db.query('SELECT count(*) FROM diagnoses WHERE repair_job_id=$1', [fixtures.createdJobId])).rows[0].count), 2);
});

test('US07 - concurrent identical assignments create only one history entry', async () => {
  const count = async () => Number((await db.query('SELECT count(*) FROM mechanic_assignments WHERE repair_job_id=$1', [fixtures.createdJobId])).rows[0].count);
  const beforeCount = await count();
  const results = await Promise.all([1,2].map(() => api(`/repair-jobs/${fixtures.createdJobId}/assign`, {
    method: 'PUT', tk: tokens.manager, body: {mechanicId: fixtures.mechanicAId}})));
  assert.deepEqual(results.map(r => r.status), [200,200]);
  assert.equal(await count(), beforeCount + 1);
  assert.equal(results[0].json.data.id, results[1].json.data.id);
});

test('US06/07 - terminal jobs cannot be reassigned, diagnosed or reopened', async () => {
  const jump = await api(`/repair-jobs/${fixtures.createdJobId}/status`, {method:'PUT',tk:tokens.mechanicA,body:{status:'completed'}});
  assert.equal(jump.status,409);
  await db.query("UPDATE repair_jobs SET status='completed', completed_at=NOW() WHERE id=$1",[fixtures.createdJobId]);
  for (const [suffix, tk, body] of [['assign',tokens.manager,{mechanicId:fixtures.mechanicBId}],
    ['diagnosis',tokens.mechanicA,{diagnosisResult:'No'}], ['status',tokens.mechanicA,{status:'pending'}]]) {
    const res=await api(`/repair-jobs/${fixtures.createdJobId}/${suffix}`,{method:'PUT',tk,body});
    assert.equal(res.status,409);
  }
  const history=await api(`/vehicles/${fixtures.vehicleId}/repair-history`,{tk:tokens.receptionist});
  assert.equal(history.status,200);
  assert.ok(history.json.data.some(j => String(j.id)===String(fixtures.createdJobId)));
});

test('US01/02 - reject bad CRUD input and malformed URL IDs', async () => {
  for (const [url,body] of [['/customers',{fullName:'   ',phone:'123'}],
    ['/customers',{fullName:'A',phone:'1'.repeat(21)}], ['/vehicles',{customerId:fixtures.customerId,licensePlate:'X',brand:42,model:'Y'}]]) {
    assert.equal((await api(url,{method:'POST',tk:tokens.receptionist,body})).status,400);
  }
  for (const url of ['/customers/1.5','/vehicles/9007199254740992','/repair-jobs/abc'])
    assert.equal((await api(url,{tk:tokens.receptionist})).status,400);
  assert.equal((await api(`/customers/${fixtures.customerId}`, {method:'PUT',tk:tokens.receptionist,body:{phone:'0987654321'}})).status,200);
});
