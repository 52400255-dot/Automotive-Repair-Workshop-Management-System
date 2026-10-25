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
const { test, describe } = require('node:test');
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

const { authenticateToken, JWT_ERROR_NAMES } = require('../../backend/src/middleware/auth');
const { env } = require('../../backend/src/config/env');

function fakeRes() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

/** Goi middleware voi header Authorization cho trước. */
function run(authorization) {
  const req = { headers: authorization ? { authorization } : {}, user: undefined };
  const res = fakeRes();
  const nextCalls = [];
  authenticateToken(req, res, (err) => nextCalls.push(err ?? null));
  return { req, res, nextCalls };
}

const validToken = jwt.sign(
  { id: 42, role: 'mechanic', email: 'tho@workshop.vn' },
  env.jwt.secret,
  { expiresIn: '1h' }
);

describe('SL-01 — authenticateToken sau khi sửa cảnh báo S2486', () => {
  test('không có header Authorization → 401, không gọi next', () => {
    const { res, nextCalls } = run(undefined);
    assert.equal(res.statusCode, 401);
    assert.match(res.body.message, /Không tìm thấy token/);
    assert.equal(nextCalls.length, 0);
  });

  test('header không phải Bearer → 401', () => {
    const { res } = run(`Basic ${validToken}`);
    assert.equal(res.statusCode, 401);
  });

  test('token hợp lệ → gắn req.user và gọi next() đúng 1 lần, không gửi response', () => {
    const { req, res, nextCalls } = run(`Bearer ${validToken}`);
    assert.deepEqual(req.user, { id: 42, role: 'mechanic', email: 'tho@workshop.vn' });
    assert.equal(nextCalls.length, 1);
    assert.equal(nextCalls[0], null);
    assert.equal(res.statusCode, null, 'Middleware thành công không được gửi response');
  });

  test('token sai chữ ký → 401 "Token không hợp lệ"', () => {
    const forged = jwt.sign({ id: 1, role: 'admin' }, 'mot-khoa-khac-hoan-toan');
    const { res } = run(`Bearer ${forged}`);
    assert.equal(res.statusCode, 401);
    assert.match(res.body.message, /không hợp lệ/);
  });

  test('token đã hết hạn → 401 và thông báo phân biệt với token sai', () => {
    const expired = jwt.sign({ id: 1, role: 'admin' }, env.jwt.secret, { expiresIn: '-10s' });
    const { res } = run(`Bearer ${expired}`);
    assert.equal(res.statusCode, 401);
    assert.match(res.body.message, /hết hạn/);
  });

  test('REGRESSION: lỗi ném ra từ middleware phía sau KHÔNG bị biến thành 403', () => {
    // Trc khi sua: next() nam trong try => loi cua tang sau bi catch bat
    // va chuyen thanh 403 "Token khong hop le", dong thoi co the gui 2 response.
    const req = { headers: { authorization: `Bearer ${validToken}` }, user: undefined };
    const res = fakeRes();
    const boom = new Error('lỗi từ controller phía sau');

    assert.throws(
      () => authenticateToken(req, res, () => { throw boom; }),
      (err) => err === boom,
      'Lỗi phía sau phải được ném trả/đẩy tiếp, không bị nuốt ở đây'
    );
    assert.equal(res.statusCode, null, 'Không được gửi response 403 cho lỗi không thuộc về token');
  });

  test('lỗi không thuộc nhóm JWT được đẩy tới next(err) thay vì trả 403', () => {
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
      authenticateToken(req, res, (err) => caught.push(err));
      assert.equal(res.statusCode, null, 'Khong duoc gui 403 cho loi khong thuoc ve token');
      assert.deepEqual(caught, [systemError], 'Loi phai duoc chuyen tiep cho error handler');
    } finally {
      jwt.verify = originalVerify;
    }
  });

  test('tap loi duoc phan loai la cua JWT dung nhu tai lieu jsonwebtoken', () => {
    assert.deepEqual(
      [...JWT_ERROR_NAMES].sort(),
      ['JsonWebTokenError', 'NotBeforeError', 'TokenExpiredError'],
    );
  });
});
