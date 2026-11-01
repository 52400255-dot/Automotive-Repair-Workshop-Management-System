const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

Object.assign(process.env, {
  DB_USER: 'unit_test_user',
  DB_PASSWORD: 'unit_test_password',
  DB_NAME: 'unit_test_db',
  JWT_SECRET: 'unit_test_jwt_secret_for_user_service',
});

const { pool } = require('../../backend/src/config/db');
const userService = require('../../backend/src/services/user.service');

let originalQuery;
let originalConnect;
let queryCalls;

describe('user.service — danh sách và đổi vai trò', () => {
  beforeEach(() => {
    originalQuery = pool.query;
    originalConnect = pool.connect;
    queryCalls = [];
  });

  afterEach(() => {
    pool.query = originalQuery;
    pool.connect = originalConnect;
  });

  test('chỉ trả về các cột công khai trong danh sách người dùng', async () => {
    const rows = [{ id: '1', full_name: 'Admin Test', email: 'admin@test.local', role: 'admin' }];
    pool.query = async (...args) => {
      queryCalls.push(args);
      return { rows };
    };

    assert.deepEqual(await userService.listUsers(), rows);
    assert.match(queryCalls[0][0], /SELECT id, full_name, email, role, created_at FROM users/);
    assert.doesNotMatch(queryCalls[0][0], /password_hash/i);
  });

  test('chỉ nhận role trong allowlist', () => {
    assert.equal(userService.isAllowedRole('admin'), true);
    assert.equal(userService.isAllowedRole('mechanic'), true);
    assert.equal(userService.isAllowedRole('root'), false);
    assert.equal(userService.isAllowedRole(null), false);
  });

  test('đổi role trong transaction bằng câu lệnh tham số hóa', async () => {
    const row = { id: '7', full_name: 'Target Test', email: 'target@test.local', role: 'mechanic' };
    const responses = [
      { rows: [] },
      { rows: [{ id: '1' }] },
      { rows: [{ id: '7', role: 'receptionist' }] },
      { rows: [row] },
      { rows: [] },
    ];
    const client = {
      async query(...args) { queryCalls.push(args); return responses.shift(); },
      release() { queryCalls.push(['release']); },
    };
    pool.connect = async () => client;

    assert.deepEqual(await userService.updateRole('7', 'mechanic', '1'), row);
    assert.equal(queryCalls[0][0], 'BEGIN');
    assert.match(queryCalls[1][0], /SELECT id FROM users WHERE role = 'admin'.*FOR UPDATE/);
    assert.match(queryCalls[2][0], /SELECT id, role FROM users WHERE id = \$1 FOR UPDATE/);
    assert.match(queryCalls[3][0], /UPDATE users SET role = \$2 WHERE id = \$1 RETURNING/);
    assert.deepEqual(queryCalls[3][1], [7, 'mechanic']);
    assert.doesNotMatch(queryCalls[3][0], /password_hash/i);
    assert.equal(queryCalls[4][0], 'COMMIT');
    assert.deepEqual(queryCalls[5], ['release']);
  });

  test('từ chối id không hợp lệ trước khi truy vấn database', async () => {
    await assert.rejects(userService.updateRole('1.5', 'mechanic', '1'), { statusCode: 400 });
    assert.equal(queryCalls.length, 0);
  });

  test('từ chối role ngoài allowlist trước khi truy vấn database', async () => {
    await assert.rejects(userService.updateRole('7', 'superuser', '1'), { statusCode: 400 });
    assert.equal(queryCalls.length, 0);
  });

  test('trả 404 khi id hợp lệ không khớp người dùng nào', async () => {
    const responses = [{ rows: [] }, { rows: [{ id: '1' }] }, { rows: [] }];
    const client = {
      async query(...args) { queryCalls.push(args); return responses.shift(); },
      release() { queryCalls.push(['release']); },
    };
    pool.connect = async () => client;

    await assert.rejects(userService.updateRole('999999999', 'mechanic', '1'), { statusCode: 404 });
    assert.equal(queryCalls.at(-2)[0], 'ROLLBACK');
    assert.deepEqual(queryCalls.at(-1), ['release']);
  });

  test('không cho admin tự hạ quyền và rollback transaction', async () => {
    const responses = [
      { rows: [] },
      { rows: [{ id: '7' }] },
      { rows: [{ id: '7', role: 'admin' }] },
      { rows: [] },
    ];
    const client = {
      async query(...args) { queryCalls.push(args); return responses.shift(); },
      release() { queryCalls.push(['release']); },
    };
    pool.connect = async () => client;

    await assert.rejects(userService.updateRole('7', 'receptionist', '7'), { statusCode: 409 });
    assert.equal(queryCalls.at(-2)[0], 'ROLLBACK');
    assert.deepEqual(queryCalls.at(-1), ['release']);
    assert.equal(queryCalls.some(([sql]) => /^UPDATE users/.test(sql)), false);
  });

  test('không cho hạ quyền admin cuối cùng và rollback transaction', async () => {
    const responses = [
      { rows: [] },
      { rows: [{ id: '1' }] },
      { rows: [{ id: '1', role: 'admin' }] },
      { rows: [] },
    ];
    const client = {
      async query(...args) { queryCalls.push(args); return responses.shift(); },
      release() { queryCalls.push(['release']); },
    };
    pool.connect = async () => client;

    await assert.rejects(userService.updateRole('1', 'mechanic', '2'), { statusCode: 409 });
    assert.equal(queryCalls.at(-2)[0], 'ROLLBACK');
    assert.deepEqual(queryCalls.at(-1), ['release']);
    assert.equal(queryCalls.some(([sql]) => /^UPDATE users/.test(sql)), false);
  });

  test('database error rollback transaction, release connection and keep original error', async () => {
    const databaseError = new Error('update failed');
    const client = {
      async query(...args) {
        queryCalls.push(args);
        if (args[0].startsWith('UPDATE users')) throw databaseError;
        return { rows: args[0] === 'SELECT id FROM users WHERE role = \'admin\' ORDER BY id FOR UPDATE'
          ? [{ id: '1' }]
          : [{ id: '7', role: 'receptionist' }] };
      },
      release() { queryCalls.push(['release']); },
    };
    pool.connect = async () => client;

    await assert.rejects(userService.updateRole('7', 'mechanic', '1'), (error) => error === databaseError);
    assert.equal(queryCalls.at(-2)[0], 'ROLLBACK');
    assert.deepEqual(queryCalls.at(-1), ['release']);
  });
});
