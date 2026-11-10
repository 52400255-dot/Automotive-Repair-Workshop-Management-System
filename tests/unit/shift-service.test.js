const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

Object.assign(process.env, {
  DB_USER: 'unit_test_user', DB_PASSWORD: 'unit_test_password', DB_NAME: 'unit_test_db',
  JWT_SECRET: 'unit_test_jwt_secret_for_shifts',
});

const { pool } = require('../../backend/src/config/db');
const shiftService = require('../../backend/src/services/shift.service');
let originalConnect;
let originalQuery;

describe('shift.service — ca làm và quỹ', () => {
  beforeEach(() => { originalConnect = pool.connect; originalQuery = pool.query; });
  afterEach(() => { pool.connect = originalConnect; pool.query = originalQuery; });

  test('không mở ca mới khi còn ca đang mở', async () => {
    const calls = [];
    pool.connect = async () => ({
      async query(sql) {
        calls.push(sql);
        if (sql === 'BEGIN') return { rows: [] };
        if (sql.includes("WHERE status = 'open'")) return { rows: [{ id: 8, status: 'open' }] };
        return { rows: [] };
      },
      release() {},
    });
    await assert.rejects(shiftService.openShift({ shiftName: 'ca_2', openingCash: 1000, userId: 4 }), { statusCode: 409 });
    assert.ok(calls.includes('ROLLBACK'));
    assert.ok(!calls.some((sql) => sql.startsWith('INSERT INTO shifts')));
  });

  test('mở ca mới trong giao dịch khi chưa có ca hoạt động', async () => {
    const calls = [];
    pool.connect = async () => ({
      async query(sql, params) {
        calls.push([sql, params]);
        if (sql.includes("WHERE status = 'open'")) return { rows: [] };
        if (sql.includes('CURRENT_TIMESTAMP AT TIME ZONE')) return { rows: [{ work_date: '2026-11-08' }] };
        if (sql.startsWith('INSERT INTO shifts')) return { rows: [{ id: '9', shift_name: 'ca_1', opening_cash: '3000000', status: 'open' }] };
        return { rows: [] };
      },
      release() { calls.push(['release']); },
    });
    const shift = await shiftService.openShift({ shiftName: 'ca_1', openingCash: 3000000, userId: 4 });
    assert.equal(shift.id, '9');
    assert.deepEqual(calls.find(([sql]) => sql.startsWith('INSERT INTO shifts'))[1], ['ca_1', '2026-11-08', 4, 3000000]);
    assert.equal(calls.at(-2)[0], 'COMMIT');
  });

  test('chi từ ngưỡng yêu cầu quản lý duyệt, tiền đang chờ chưa tính vào quỹ', async () => {
    let inserted;
    pool.connect = async () => ({
      async query(sql, params) {
        if (sql.includes('SELECT id, status FROM shifts')) return { rows: [{ id: 2, status: 'open' }] };
        if (sql.startsWith('INSERT INTO cash_transactions')) { inserted = params; return { rows: [{ id: 3, approval_status: params[8] }] }; }
        return { rows: [] };
      }, release() {},
    });
    const transaction = await shiftService.recordTransaction({ shiftId: 2, type: 'outflow', category: 'operational_expense', amount: 2000000, description: 'Mua vật tư', userId: 4 });
    assert.equal(transaction.approval_status, 'pending');
    assert.equal(inserted[8], 'pending');
    await assert.rejects(shiftService.recordTransaction({ shiftId: 2, type: 'outflow', category: 'operational_expense', amount: 2000, paymentMethod: 'bank_transfer', description: 'Sai quỹ', userId: 4 }), { statusCode: 400 });
  });

  test('chốt ca tính quỹ lý thuyết, tiền nộp két và đối soát ba phương thức', async () => {
    const calls = [];
    pool.connect = async () => ({
      async query(sql, params) {
        calls.push([sql, params]);
        if (sql.startsWith('SELECT * FROM shifts')) return { rows: [{ id: 5, status: 'open', opened_by: 4, opening_cash: '3000000' }] };
        if (sql.includes('SELECT COUNT(*)')) return { rows: [{ count: 0 }] };
        if (sql.includes('SELECT COALESCE(SUM(amount)')) return { rows: [{ cash_in: '4000000', cash_replenishment: '0', bank_in: '5000000', pos_in: '2000000', cash_out: '1000000', cash_orders: 3, bank_orders: 4, pos_orders: 8 }] };
        if (sql.startsWith('UPDATE shifts')) return { rows: [{ id: 5, status: 'closed' }] };
        return { rows: [] };
      }, release() {},
    });
    const closed = await shiftService.closeShift({
      shiftId: 5, actualCash: 6000000, reconciledBankInflow: 5000000, reconciledPosInflow: 2000000,
      userId: 4, userRole: 'receptionist',
    });
    assert.equal(closed.status, 'closed');
    const update = calls.find(([sql]) => sql.startsWith('UPDATE shifts'));
    assert.equal(update[1][2], 6000000);
    assert.equal(update[1][4], 0);
    assert.equal(update[1][5], 3000000);
    assert.deepEqual(update[1].slice(6, 13), [4000000, '5000000', '1000000', '2000000', 3, 4, 8]);
    assert.deepEqual(update[1].slice(13, 17), [5000000, 0, 2000000, 0]);
    assert.equal(update[1][17], '0');
  });

  test('chốt ca cần nhập đối soát cả ba phương thức và giải trình mọi chênh lệch', async () => {
    await assert.rejects(shiftService.closeShift({ shiftId: 1, actualCash: 100, userId: 1 }), { statusCode: 400 });
    pool.connect = async () => ({
      async query(sql) {
        if (sql.startsWith('SELECT * FROM shifts')) return { rows: [{ id: 1, status: 'open', opened_by: 1, opening_cash: '100' }] };
        if (sql.includes('SELECT COUNT(*)')) return { rows: [{ count: 0 }] };
        if (sql.includes('SELECT COALESCE(SUM(amount)')) return { rows: [{ cash_in: '0', bank_in: '0', pos_in: '0', cash_out: '0', cash_orders: 0, bank_orders: 0, pos_orders: 0 }] };
        return { rows: [] };
      }, release() {},
    });
    await assert.rejects(shiftService.closeShift({ shiftId: 1, actualCash: 1000, reconciledBankInflow: 0, reconciledPosInflow: 0, userId: 1 }), { statusCode: 400 });
  });

  test('tính nộp két từ tiền mặt kiểm kê sau khi giữ lại tiền gốc', async () => {
    const calls = [];
    pool.connect = async () => ({
      async query(sql, params) {
        calls.push([sql, params]);
        if (sql.startsWith('SELECT * FROM shifts')) return { rows: [{ id: 2, status: 'open', opened_by: 4, opening_cash: '3000000' }] };
        if (sql.includes('SELECT COUNT(*)')) return { rows: [{ count: 0 }] };
        if (sql.includes('SELECT COALESCE(SUM(amount)')) return { rows: [{ cash_in: '2000000', cash_replenishment: '0', bank_in: '0', pos_in: '0', cash_out: '0', cash_orders: 2, bank_orders: 0, pos_orders: 0 }] };
        if (sql.startsWith('UPDATE shifts')) return { rows: [{ id: 2, status: 'closed', deposited_cash: params[5] }] };
        return { rows: [] };
      }, release() {},
    });
    const result = await shiftService.closeShift({
      shiftId: 2, actualCash: 5000000, reconciledBankInflow: 0, reconciledPosInflow: 0,
      userId: 4, userRole: 'receptionist',
    });
    assert.equal(result.deposited_cash, 2000000);
    const update = calls.find(([sql]) => sql.startsWith('UPDATE shifts'));
    assert.equal(update[1][5], 2000000);
  });
});
