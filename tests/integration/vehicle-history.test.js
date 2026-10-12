/**
 * vehicle-history.test.js — Integration test cho US03 (View Vehicle Repair History).
 *
 * Chạy thật toàn bộ luồng: HTTP API + PostgreSQL (không mock).
 * Cần một database đã apply hết database/migrations/*.sql.
 *
 * Cách chạy (xem script ở package.json gốc):
 *   npm run test:integration
 *
 * Biến môi trường (có giá trị mặc định khớp docker-compose):
 *   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, TEST_PORT
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawn } = require('node:child_process');

/** pg + jsonwebtoken chỉ cài ở backend/, nên thử resolve từ đó nếu root không có. */
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

const PORT = Number(process.env.TEST_PORT || 3111);
const BASE = `http://localhost:${PORT}/api/v1`;
const SECRET = 'integration_test_secret';

/** Ký JWT trực tiếp (middleware chỉ đọc payload, không truy vấn DB) */
const token = (user) => jwt.sign(user, SECRET, { expiresIn: '1h' });

const tokens = {
  receptionist: token({ id: '1', role: 'receptionist', email: 'rec.test@workshop.vn' }),
  manager: token({ id: '5', role: 'service_manager', email: 'mgr.test@workshop.vn' }),
  mechanic: token({ id: '3', role: 'mechanic', email: 'mec.test@workshop.vn' }),
  ownerCustomer: token({ id: '501', role: 'customer', email: 'US03-Owner@Example.com' }),
  strangerCustomer: token({ id: '502', role: 'customer', email: 'nobody@example.com' }),
};

let server;
let db;
const fixtures = { receptionist: null, mechanic: null, sparePart: null,
  customerA: null, customerB: null, vehicleA: null, vehicleB: null,
  jobA1: null, jobA2: null, jobB1: null, service: null };

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
  try { json = await res.json(); } catch { /* response rỗng */ }
  return { status: res.status, json };
}

async function waitUntilUp() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://localhost:${PORT}/api/health`);
      if (res.ok) return;
    } catch { /* server chưa lên */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('Backend khong khoi dong duoc tren cong ' + PORT);
}

before(async () => {
  db = new Client(DB);
  await db.connect();

  server = spawn(process.execPath, [path.join(BACKEND, 'src', 'server.js')], {
    cwd: BACKEND,
    env: { ...process.env, PORT: String(PORT), DB_HOST: DB.host, DB_PORT: String(DB.port),
      DB_USER: DB.user, DB_PASSWORD: DB.password, DB_NAME: DB.database, JWT_SECRET: SECRET },
    stdio: 'ignore',
  });
  await waitUntilUp();

  // ---- Người dùng + phụ tùng phục vụ phiếu sửa (không phụ thuộc seed, CI chỉ chạy migration)
  const mk = async (sql, params) => (await db.query(sql, params)).rows[0];

  fixtures.receptionist = (await mk(
    `INSERT INTO users (full_name, email, password_hash, role)
     VALUES ('US03 Receptionist', 'us03.rec@integration.test', 'not-a-real-hash', 'receptionist')
     RETURNING id`)).id;
  fixtures.mechanic = (await mk(
    `INSERT INTO users (full_name, email, password_hash, role)
     VALUES ('US03 Mechanic', 'us03.mec@integration.test', 'not-a-real-hash', 'mechanic')
     RETURNING id`)).id;
  fixtures.sparePart = (await mk(
    `INSERT INTO spare_parts (part_code, part_name, unit, stock_quantity, unit_price, min_stock)
     VALUES ('US03-PART', 'Loc dau', 'piece', 100, 150000, 5) RETURNING id`)).id;

  // ---- 2 khách hàng, mỗi khách 1 xe; phiếu sửa nằm rải rác để kiểm tra phân tách theo xe
  fixtures.customerA = (await mk(
    `INSERT INTO customers (full_name, phone, email)
     VALUES ('US03 Owner', '0900000001', 'us03-owner@example.com') RETURNING id`)).id;
  fixtures.customerB = (await mk(
    `INSERT INTO customers (full_name, phone, email)
     VALUES ('US03 Stranger', '0900000002', 'us03-stranger@example.com') RETURNING id`)).id;

  fixtures.vehicleA = (await mk(
    `INSERT INTO vehicles (customer_id, license_plate, brand, model, manufacture_year)
     VALUES ($1, 'US03A-111.11', 'Toyota', 'Fortuner', 2023) RETURNING id`,
    [fixtures.customerA])).id;
  fixtures.vehicleB = (await mk(
    `INSERT INTO vehicles (customer_id, license_plate, brand, model, manufacture_year)
     VALUES ($1, 'US03B-222.22', 'Ford', 'Ranger', 2021) RETURNING id`,
    [fixtures.customerB])).id;

  const receptionist = fixtures.receptionist;
  const mechanic = fixtures.mechanic;

  for (const [key, plate] of [['jobA1', 'US03A-111.11'], ['jobA2', 'US03A-111.11']]) {
    fixtures[key] = (await mk(
      `INSERT INTO repair_jobs (vehicle_id, receptionist_id, customer_request, status, completed_at)
       VALUES ((SELECT id FROM vehicles WHERE license_plate = $1), $2, $3, 'completed', CURRENT_TIMESTAMP)
       RETURNING id`,
      [plate, receptionist, `Yeu cau rieng cua ${key} - ${plate}`])).id;
  }
  fixtures.jobB1 = (await mk(
    `INSERT INTO repair_jobs (vehicle_id, receptionist_id, customer_request, status)
     VALUES ($1, $2, 'Phieu cua xe KHAC - khong duoc xuat hien o xe A', 'completed')
     RETURNING id`,
    [fixtures.vehicleB, receptionist])).id;

  // Dich vu + phu tung + tho may + hoa don cho job A1 (AC3: thong tin can hien thi)
  fixtures.service = (await mk(
    `INSERT INTO services (service_code, service_name, standard_price)
     VALUES ('US03-SVC', 'Thay dau may', 200000) RETURNING id`)).id;
  await db.query(
    `INSERT INTO repair_details (repair_job_id, service_id, quantity, unit_price_at_time)
     VALUES ($1, $2, 2, 200000)`, [fixtures.jobA1, fixtures.service]);
  await db.query(
    `INSERT INTO used_parts (repair_job_id, spare_part_id, quantity, unit_price_at_time)
     VALUES ($1, $2, 4, 150000)`, [fixtures.jobA1, fixtures.sparePart]);
  await db.query(
    `INSERT INTO mechanic_assignments (repair_job_id, mechanic_id, assigned_by, status)
     VALUES ($1, $2, $3, 'completed')`, [fixtures.jobA1, mechanic, receptionist]);
  await db.query(
    `INSERT INTO invoices (repair_job_id, status, total_amount, issued_at)
     VALUES ($1, 'paid', 1000000, CURRENT_TIMESTAMP)`, [fixtures.jobA1]);
});

after(async () => {
  // Dọn sạch dữ liệu test theo đúng thứ tự khoá ngoại (dù before có lỗi giữa chừng)
  const safe = async (sql, params) => {
    try { await db.query(sql, params); } catch (err) { console.error('cleanup:', err.message); }
  };
  if (db) {
    const jobIds = [fixtures.jobA1, fixtures.jobA2, fixtures.jobB1].filter(Boolean);
    if (jobIds.length) {
      await safe('DELETE FROM repair_details WHERE repair_job_id = ANY($1::bigint[])', [jobIds]);
      await safe('DELETE FROM used_parts WHERE repair_job_id = ANY($1::bigint[])', [jobIds]);
      await safe('DELETE FROM mechanic_assignments WHERE repair_job_id = ANY($1::bigint[])', [jobIds]);
      await safe('DELETE FROM invoice_details WHERE invoice_id IN (SELECT id FROM invoices WHERE repair_job_id = ANY($1::bigint[]))', [jobIds]);
      await safe('DELETE FROM invoices WHERE repair_job_id = ANY($1::bigint[])', [jobIds]);
      await safe('DELETE FROM repair_jobs WHERE id = ANY($1::bigint[])', [jobIds]);
    }
    if (fixtures.service) await safe('DELETE FROM services WHERE id = $1', [fixtures.service]);
    if (fixtures.vehicleA) await safe('DELETE FROM vehicles WHERE id = ANY($1::bigint[])', [[fixtures.vehicleA, fixtures.vehicleB].filter(Boolean)]);
    if (fixtures.customerA) await safe('DELETE FROM customers WHERE id = ANY($1::bigint[])', [[fixtures.customerA, fixtures.customerB].filter(Boolean)]);
    if (fixtures.sparePart) await safe('DELETE FROM spare_parts WHERE id = $1', [fixtures.sparePart]);
    const userIds = [fixtures.receptionist, fixtures.mechanic].filter(Boolean);
    if (userIds.length) await safe('DELETE FROM users WHERE id = ANY($1::bigint[])', [userIds]);
    await db.end();
  }
  if (server) server.kill();
});

// ---------------------------------------------------------------- AC1: tìm kiếm / chọn phương tiện
test('AC1 - tim kiem xe theo bien so va theo ten khach hang', async () => {
  const byPlate = await api('/vehicles?search=US03A', { tk: tokens.receptionist });
  assert.equal(byPlate.status, 200);
  assert.equal(byPlate.json.data.length, 1, 'Chi mot xe khop bien so US03A');
  assert.equal(byPlate.json.data[0].license_plate, 'US03A-111.11');

  const byCustomer = await api('/vehicles?search=US03%20Owner', { tk: tokens.receptionist });
  assert.equal(byCustomer.json.data.length, 1, 'Tim theo ten khach hang cung ra dung xe');

  const all = await api('/vehicles', { tk: tokens.receptionist });
  assert.ok(all.json.data.length >= 2, 'Khong tu khoa thi tra du dan thieu de cho chon');
});

// ---------------------------------------------------------------- AC2 + AC4: xem lịch sử, liên kết đúng xe
test('AC2, AC4 - xem duoc lich su cua xe va lien dung phuong tien', async () => {
  const r = await api(`/vehicles/${fixtures.vehicleA}/repair-history`, { tk: tokens.receptionist });
  assert.equal(r.status, 200);
  assert.equal(r.json.data.length, 2, 'Xe A co 2 phieu trong lich su');

  for (const row of r.json.data) {
    assert.equal(String(row.vehicle_id), String(fixtures.vehicleA), ' Moi phieu phai thuoc xe A');
    assert.equal(row.license_plate, 'US03A-111.11');
  }
  const ids = r.json.data.map((x) => String(x.id)).sort();
  assert.deepEqual(ids, [String(fixtures.jobA1), String(fixtures.jobA2)].sort());
});

// ---------------------------------------------------------------- AC5: không lẫn xe khác
test('AC5 - lich su xe A khong chua phieu cua xe khac', async () => {
  const a = await api(`/vehicles/${fixtures.vehicleA}/repair-history`, { tk: tokens.receptionist });
  const b = await api(`/vehicles/${fixtures.vehicleB}/repair-history`, { tk: tokens.receptionist });

  const aIds = a.json.data.map((x) => String(x.id));
  const bIds = b.json.data.map((x) => String(x.id));

  assert.deepEqual(bIds, [String(fixtures.jobB1)]);
  assert.ok(!aIds.includes(String(fixtures.jobB1)), 'Phieu cua xe B khong duoc xuat hien o xe A');
  assert.ok(!bIds.some((id) => aIds.includes(id)), 'Hai danh sach khong duoc trung phieu nao');
});

// ---------------------------------------------------------------- AC3: hiển thị thông tin cần thiết
test('AC3 - mot dong lich su day du thong tin can thiet', async () => {
  const r = await api(`/vehicles/${fixtures.vehicleA}/repair-history`, { tk: tokens.receptionist });
  const row = r.json.data.find((x) => String(x.id) === String(fixtures.jobA1));

  for (const field of ['id', 'status', 'customer_request', 'received_at', 'completed_at',
    'license_plate', 'brand', 'model', 'customer_name', 'receptionist_name']) {
    assert.ok(row[field] !== undefined, `Thieu truong '${field}' trong lich su`);
  }

  assert.equal(row.customer_name, 'US03 Owner');
  assert.equal(row.status, 'completed');
  assert.deepEqual(row.services, [{ name: 'Thay dau may', quantity: 2 }]);
  assert.equal(row.parts.length, 1, 'Phu tung da dung phai hien trong lich su');
  assert.equal(row.mechanics.length, 1, 'Tho may ph thuoc phai hien trong lich su');
  assert.equal(Number(row.labor_total), 400000);
  assert.equal(Number(row.parts_total), 600000);
  assert.equal(Number(row.invoice_total), 1000000);
});

// ---------------------------------------------------------------- Kiểm soát truy cập (AC5 + User Story)
test('Khong cho phep doc lich su cua phuong tien khac quyen', async () => {
  const noToken = await api(`/vehicles/${fixtures.vehicleA}/repair-history`);
  assert.equal(noToken.status, 401, 'Khong co token -> 401');

  const mechanic = await api(`/vehicles/${fixtures.vehicleA}/repair-history`, { tk: tokens.mechanic });
  assert.equal(mechanic.status, 403, 'Tho may khong duoc doc lich su xe khong duoc phan cong');

  const stranger = await api(`/vehicles/${fixtures.vehicleA}/repair-history`, { tk: tokens.strangerCustomer });
  assert.equal(stranger.status, 403, 'Khach hang khong so huu xe bi tu choi');

  const owner = await api(`/vehicles/${fixtures.vehicleA}/repair-history`, { tk: tokens.ownerCustomer });
  assert.equal(owner.status, 200, 'Khach hang van xem duoc xe cua minh tren portal');
  assert.equal(owner.json.data.length, 2);

  const manager = await api(`/vehicles/${fixtures.vehicleA}/repair-history`, { tk: tokens.manager });
  assert.equal(manager.status, 200, 'Quan ly dich vu doc duoc de kiem soat');
});

test('Ma hoa dau vao hop le: id sai tra 400, xe khong ton tai tra 404', async () => {
  const bad = await api('/vehicles/abc/repair-history', { tk: tokens.receptionist });
  assert.equal(bad.status, 400, 'id khong phai so -> 400 (truoc day roi 500 + loi SQL)');
  assert.ok(!JSON.stringify(bad.json).includes('invalid input syntax'), 'Khong duoc ro loi database ra client');

  const zero = await api('/vehicles/0/repair-history', { tk: tokens.receptionist });
  assert.equal(zero.status, 400);

  const missing = await api('/vehicles/99999999/repair-history', { tk: tokens.receptionist });
  assert.equal(missing.status, 404, 'Xe khong ton tai -> 404, khong phai 200 rong');
});
