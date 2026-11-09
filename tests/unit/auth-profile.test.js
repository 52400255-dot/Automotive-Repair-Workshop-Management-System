const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

Object.assign(process.env, {
  DB_USER: 'unit_test_user',
  DB_PASSWORD: 'unit_test_password',
  DB_NAME: 'unit_test_db',
  JWT_SECRET: 'unit_test_jwt_secret_for_profile',
});

const { pool } = require('../../backend/src/config/db');
const authService = require('../../backend/src/services/auth.service');

let originalConnect;
let originalQuery;

describe('Hồ sơ tài khoản hiện tại', () => {
  beforeEach(() => {
    originalConnect = pool.connect;
    originalQuery = pool.query;
  });
  afterEach(() => {
    pool.connect = originalConnect;
    pool.query = originalQuery;
  });

  test('đồng bộ thông tin khách hàng liên kết trong một giao dịch', async () => {
    const calls = [];
    pool.connect = async () => ({
      async query(sql, params) {
        calls.push([sql, params]);
        if (sql.includes('SELECT role')) return { rowCount: 1, rows: [{ role: 'customer' }] };
        if (sql.includes('SELECT id FROM users')) return { rowCount: 0 };
        return { rowCount: 1 };
      },
      release() { calls.push(['release']); },
    });
    pool.query = async () => ({ rows: [{ id: 4, full_name: 'Tên Mới', email: 'new@test.local', role: 'customer', phone: '0912345678' }] });

    const result = await authService.updateProfile(4, {
      fullName: '  Tên Mới  ', email: ' NEW@test.local ', phone: '0912 345 678', address: 'Địa chỉ mới',
    });
    assert.equal(result.full_name, 'Tên Mới');
    assert.deepEqual(calls[3][1], [4, 'Tên Mới', 'new@test.local']);
    assert.deepEqual(calls[4][1], [4, 'Tên Mới', 'new@test.local', '0912345678', 'Địa chỉ mới']);
    assert.equal(calls[5][0], 'COMMIT');
    assert.deepEqual(calls.at(-1), ['release']);
  });

  test('từ chối email đã dùng và rollback', async () => {
    const calls = [];
    pool.connect = async () => ({
      async query(sql) {
        calls.push(sql);
        if (sql.includes('SELECT role')) return { rowCount: 1, rows: [{ role: 'admin' }] };
        if (sql.includes('SELECT id FROM users')) return { rowCount: 1 };
        return { rowCount: 0 };
      },
      release() {},
    });
    await assert.rejects(authService.updateProfile(4, { fullName: 'Tên Mới', email: 'used@test.local' }), { statusCode: 409 });
    assert.ok(calls.includes('ROLLBACK'));
    assert.ok(!calls.some((sql) => sql.startsWith('UPDATE users')));
  });

  test('chỉ đổi mật khẩu khi mật khẩu hiện tại đúng', async () => {
    const oldHash = '$2b$10$SiJ8GZbnmaKE0CwG7BFaJe1BH9c9/ylxb0QVeDcs3VCYbNPlDIu1m';
    const calls = [];
    pool.connect = async () => ({
      async query(sql, params) {
        calls.push([sql, params]);
        if (sql.includes('SELECT password_hash')) return { rowCount: 1, rows: [{ password_hash: oldHash }] };
        return { rowCount: 1 };
      },
      release() {},
    });

    await assert.rejects(authService.changePassword(4, { currentPassword: 'wrong', newPassword: 'new-password' }), { statusCode: 400 });
    assert.equal(calls.at(-1)[0], 'ROLLBACK');
    calls.length = 0;
    await authService.changePassword(4, { currentPassword: '123456', newPassword: 'new-password' });
    const update = calls.find(([sql]) => sql.startsWith('UPDATE users'));
    assert.equal(update[1][0], 4);
    assert.equal(await authService.verifyPassword('new-password', update[1][1]), true);
    assert.equal(calls.at(-1)[0], 'COMMIT');
  });
});
