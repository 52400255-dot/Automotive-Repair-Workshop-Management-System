const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

Object.assign(process.env, {
  DB_USER: 'unit_test_user',
  DB_PASSWORD: 'unit_test_password',
  DB_NAME: 'unit_test_db',
  JWT_SECRET: 'unit_test_jwt_secret_for_inventory',
});

const { pool } = require('../../backend/src/config/db');
const sparePartService = require('../../backend/src/services/sparePart.service');

let originalConnect;
let originalQuery;

describe('sparePart.service — nhập kho', () => {
  beforeEach(() => {
    originalConnect = pool.connect;
    originalQuery = pool.query;
  });
  afterEach(() => {
    pool.connect = originalConnect;
    pool.query = originalQuery;
  });

  test('từ chối mã phụ tùng và số lượng không hợp lệ trước khi mở giao dịch', async () => {
    let connections = 0;
    pool.connect = async () => { connections += 1; };
    await assert.rejects(sparePartService.importStock({ sparePartId: 0, quantity: 1, recordedBy: 1 }), { statusCode: 400 });
    await assert.rejects(sparePartService.importStock({ sparePartId: 1, quantity: 0, recordedBy: 1 }), { statusCode: 400 });
    await assert.rejects(sparePartService.importStock({ sparePartId: 1, quantity: Infinity, recordedBy: 1 }), { statusCode: 400 });
    assert.equal(connections, 0);
  });

  test('khóa phụ tùng, cập nhật tồn và ghi biến động trong cùng giao dịch', async () => {
    const calls = [];
    pool.connect = async () => ({
      async query(sql, params) {
        calls.push([sql, params]);
        if (sql.includes('SELECT id FROM spare_parts')) return { rowCount: 1, rows: [{ id: 5 }] };
        if (sql.startsWith('UPDATE spare_parts')) return { rowCount: 1, rows: [{ id: 5, stock_quantity: '15.00' }] };
        return { rowCount: 1, rows: [] };
      },
      release() { calls.push(['release']); },
    });
    const result = await sparePartService.importStock({ sparePartId: '5', quantity: '3', recordedBy: 7 });
    assert.deepEqual(result, { id: 5, stock_quantity: '15.00' });
    assert.equal(calls[0][0], 'BEGIN');
    assert.match(calls[1][0], /SELECT id FROM spare_parts WHERE id = \$1 FOR UPDATE/);
    assert.deepEqual(calls[2][1], [5, 3]);
    assert.deepEqual(calls[3][1], [5, 7, 3]);
    assert.equal(calls[4][0], 'COMMIT');
    assert.deepEqual(calls.at(-1), ['release']);
  });

  test('rollback nếu mã phụ tùng không tồn tại', async () => {
    const calls = [];
    pool.connect = async () => ({
      async query(sql) {
        calls.push(sql);
        if (sql.includes('SELECT id FROM spare_parts')) return { rowCount: 0, rows: [] };
        return { rowCount: 0, rows: [] };
      },
      release() { calls.push('release'); },
    });

    await assert.rejects(sparePartService.importStock({ sparePartId: 999, quantity: 1, recordedBy: 7 }), { statusCode: 404 });
    assert.ok(calls.includes('ROLLBACK'));
    assert.equal(calls.includes('release'), true);
  });
});
