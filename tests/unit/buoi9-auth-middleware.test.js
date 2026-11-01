/**
 * buoi9-auth-middleware.test.js — Kiểm chứng SL-01 (Buổi 9).
 *
 * Middleware JWT trước đây có cảnh báo SonarLint S2486
 * "no-ignored-exceptions": `catch (err)` bắt lỗi nhưng không dùng đến err,
 * khiến mọi sự cố bị gộp thành một thông báo 403; ngoài ra `next()` nằm
 * trong khối `try` nên lỗi phát sinh ở middleware/controller phía sau cũng
 * bị bắt nhầm ở đây.
 *
 * File test này chứng minh: sau khi sửa, mỗi loại lỗi có phản hồi riêng và
 * lỗi của tầng sau được trả về cho global error handler.
 *
 * Chạy: npm test
 */
const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

Object.assign(process.env, {
  DB_USER: 'unit_test_user',
  DB_PASSWORD: 'unit_test_password',
  DB_NAME: 'unit_test_db',
  JWT_SECRET: 'unit_test_jwt_secret_for_buoi9',
  JWT_EXPIRES_IN: '1h',
});

// Resolve jsonwebtoken TỪ đúng thư mục source của backend (giống cách
// middleware/auth.js làm) để test và middleware dùng chung một module instance
// — cần cho trường hợp monkey-patch `verify` ở bên dưới.
const jwt = require(require.resolve('jsonwebtoken', {
  paths: [path.join(__dirname, '..', '..', 'backend', 'src', 'middleware')],
}));

const { pool } = require('../../backend/src/config/db');
const { authenticateToken, JWT_ERROR_NAMES } = require('../../backend/src/middleware/auth');
const { env } = require('../../backend/src/config/env');
const originalQuery = pool.query;

beforeEach(() => {
  pool.query = async () => ({ rows: [{ role: 'mechanic' }] });
});

afterEach(() => {
  pool.query = originalQuery;
});

function fakeRes() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

/** Goi middleware voi header Authorization cho trước. */
async function run(authorization) {
  const req = { headers: authorization ? { authorization } : {}, user: undefined };
  const res = fakeRes();
  const nextCalls = [];
  await authenticateToken(req, res, (err) => nextCalls.push(err ?? null));
  return { req, res, nextCalls };
}

const validToken = jwt.sign(
  { id: 42, role: 'mechanic', email: 'tho@workshop.vn' },
  env.jwt.secret,
  { expiresIn: '1h' }
);

describe('SL-01 — authenticateToken sau khi sửa cảnh báo S2486', () => {
  test('không có header Authorization → 401, không gọi next', async () => {
    const { res, nextCalls } = await run(undefined);
    assert.equal(res.statusCode, 401);
    assert.match(res.body.message, /Không tìm thấy token/);
    assert.equal(nextCalls.length, 0);
  });

  test('header không phải Bearer → 401', async () => {
    const { res } = await run(`Basic ${validToken}`);
    assert.equal(res.statusCode, 401);
  });

  test('token hợp lệ → lấy role hiện tại từ database rồi gọi next()', async () => {
    const { req, res, nextCalls } = await run(`Bearer ${validToken}`);
    assert.deepEqual(req.user, { id: 42, role: 'mechanic', email: 'tho@workshop.vn' });
    assert.equal(nextCalls.length, 1);
    assert.equal(nextCalls[0], null);
    assert.equal(res.statusCode, null, 'Middleware thành công không được gửi response');
  });

  test('token sai chữ ký → 401 "Token không hợp lệ"', async () => {
    const forged = jwt.sign({ id: 1, role: 'admin' }, 'mot-khoa-khac-hoan-toan');
    const { res } = await run(`Bearer ${forged}`);
    assert.equal(res.statusCode, 401);
    assert.match(res.body.message, /không hợp lệ/);
  });

  test('token đã hết hạn → 401 và thông báo phân biệt với token sai', async () => {
    const expired = jwt.sign({ id: 1, role: 'admin' }, env.jwt.secret, { expiresIn: '-10s' });
    const { res } = await run(`Bearer ${expired}`);
    assert.equal(res.statusCode, 401);
    assert.match(res.body.message, /hết hạn/);
  });

  test('token có user id sai định dạng trả về 401 trước khi truy vấn DB', async () => {
    const malformed = jwt.sign(
      { id: 'not-an-id', role: 'admin' },
      env.jwt.secret,
      { expiresIn: '1h' }
    );
    let queryCalled = false;
    pool.query = async () => {
      queryCalled = true;
      return { rows: [] };
    };

    const { res } = await run(`Bearer ${malformed}`);

    assert.equal(res.statusCode, 401);
    assert.equal(queryCalled, false);
  });

  test('lỗi truy vấn trạng thái user được chuyển cho error handler', async () => {
    const databaseError = new Error('Database unavailable');
    pool.query = async () => { throw databaseError; };

    const { res, nextCalls } = await run(`Bearer ${validToken}`);

    assert.equal(res.statusCode, null);
    assert.deepEqual(nextCalls, [databaseError]);
  });

  test('REGRESSION: lỗi ném ra từ middleware phía sau không bị bắt nhầm', async () => {
    const req = { headers: { authorization: `Bearer ${validToken}` }, user: undefined };
    const res = fakeRes();
    const boom = new Error('lỗi từ controller phía sau');

    await assert.rejects(
      authenticateToken(req, res, () => { throw boom; }),
      (err) => err === boom,
      'Lỗi phía sau phải được ném trả/đẩy tiếp, không bị nuốt ở đây'
    );
    assert.equal(res.statusCode, null, 'Không gửi response cho lỗi ở tầng sau');
  });

  test('lỗi xác thực không thuộc JWT hoặc DB được đẩy tới next(err)', async () => {
    // Mo phong mot loi he thong (khong phai loi token) boc ra luc xac thuc:
    // cat ngat ham verify cua jsonwebtoken trong module cache.
    const originalVerify = jwt.verify;
    const systemError = new Error('PostgreSQL khong tra loi');
    systemError.name = 'ConnectionError';
    jwt.verify = () => { throw systemError; };
    try {
      const req = { headers: { authorization: `Bearer ${validToken}` }, user: undefined };
      const res = fakeRes();
      const caught = [];
      await authenticateToken(req, res, (err) => caught.push(err));
      assert.equal(res.statusCode, null, 'Khong duoc gui 403 cho loi khong thuoc ve token');
      assert.deepEqual(caught, [systemError], 'Loi phai duoc chuyen tiep cho error handler');
    } finally {
      jwt.verify = originalVerify;
    }
  });

  test('role thay đổi trong DB có hiệu lực với JWT cũ', async () => {
    const adminToken = jwt.sign(
      { id: 42, role: 'admin', email: 'tho@workshop.vn' },
      env.jwt.secret,
      { expiresIn: '1h' }
    );
    pool.query = async (sql, params) => {
      assert.match(sql, /SELECT role FROM users WHERE id = \$1/);
      assert.deepEqual(params, [42]);
      return { rows: [{ role: 'receptionist' }] };
    };

    const { req, res, nextCalls } = await run(`Bearer ${adminToken}`);

    assert.equal(req.user.role, 'receptionist');
    assert.equal(res.statusCode, null);
    assert.equal(nextCalls.length, 1);
  });

  test('token hợp lệ của tài khoản đã xóa trả về 401', async () => {
    pool.query = async () => ({ rows: [] });
    const { res, nextCalls } = await run(`Bearer ${validToken}`);
    assert.equal(res.statusCode, 401);
    assert.match(res.body.message, /không còn tồn tại/);
    assert.equal(nextCalls.length, 0);
  });

  test('tap loi duoc phan loai la cua JWT dung nhu tai lieu jsonwebtoken', () => {
    assert.deepEqual(
      [...JWT_ERROR_NAMES].sort(),
      ['JsonWebTokenError', 'NotBeforeError', 'TokenExpiredError'],
    );
  });
});
