/**
 * buoi9-error-handler.test.js — Kiểm chứng SL-02 (Buổi 9).
 *
 * errorHandler đã được viết lại thành bảng tra cứu và không trả nội dung
 * lỗi nội bộ cho client trong các phản hồi 5xx.
 *
 * Chạy: npm test
 */
const { test, describe, after } = require('node:test');
const assert = require('node:assert/strict');

Object.assign(process.env, {
  DB_USER: 'unit_test_user',
  DB_PASSWORD: 'unit_test_password',
  DB_NAME: 'unit_test_db',
  JWT_SECRET: 'unit_test_jwt_secret',
});

const { errorHandler } = require('../../backend/src/middleware/errorHandler');

/** res giả ghi lại mã trạng thái và body cuối cùng. */
function fakeRes() {
  const res = {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
  return res;
}

function fakeReq(method = 'GET') {
  return { method };
}

/** Chạy errorHandler với một lỗi giả, trả về { statusCode, body }. */
function run(err, method = 'GET') {
  const res = fakeRes();
  errorHandler(err, fakeReq(method), res, () => {});
  return { statusCode: res.statusCode, body: res.body };
}

// console.error của logError làm bẩn output test -> tắt tạm trong file này.
const originalConsoleError = console.error;
console.error = () => {};
after(() => { console.error = originalConsoleError; });

describe('SL-02 — errorHandler ánh xạ lỗi và ẩn thông tin nội bộ', () => {
  test('ValidationError → 400, giữ message và errors của lỗi', () => {
    const err = Object.assign(new Error('Dữ liệu sai'), {
      name: 'ValidationError',
      errors: [{ field: 'phone', message: 'thiếu' }],
    });
    const r = run(err);
    assert.equal(r.statusCode, 400);
    assert.equal(r.body.success, false);
    assert.equal(r.body.message, 'Dữ liệu sai');
    assert.deepEqual(r.body.errors, [{ field: 'phone', message: 'thiếu' }]);
  });

  test('ValidationError không có message/errors → dùng thông báo và mảng rỗng mặc định', () => {
    const r = run({ name: 'ValidationError' });
    assert.equal(r.statusCode, 400);
    assert.equal(r.body.message, 'Dữ liệu không hợp lệ (Validation failed)');
    assert.deepEqual(r.body.errors, []);
  });

  test('UnauthorizedError → 401', () => {
    const r = run({ name: 'UnauthorizedError' });
    assert.equal(r.statusCode, 401);
    assert.equal(r.body.message, 'Không được phép truy cập (Unauthorized)');
  });

  test('ForbiddenError → 403', () => {
    const r = run({ name: 'ForbiddenError' });
    assert.equal(r.statusCode, 403);
    assert.equal(r.body.message, 'Không đủ quyền (Forbidden)');
  });

  test('NotFoundError → 404', () => {
    const r = run({ name: 'NotFoundError' });
    assert.equal(r.statusCode, 404);
    assert.equal(r.body.message, 'Không tìm thấy (Not found)');
  });

  test('PostgreSQL 23505 (unique) → 409, không trả chi tiết DB', () => {
    const r = run({ code: '23505', detail: 'Email already exists.' });
    assert.equal(r.statusCode, 409);
    assert.equal(r.body.message, 'Dữ liệu đã tồn tại (Duplicate entry)');
    assert.equal(r.body.detail, undefined);
  });

  test('PostgreSQL 23503 (foreign key) với GET → 404', () => {
    const r = run({ code: '23503' }, 'GET');
    assert.equal(r.statusCode, 404);
    assert.equal(r.body.message, 'Dữ liệu tham chiếu không tồn tại');
  });

  test('PostgreSQL 23503 với DELETE → 409', () => {
    const r = run({ code: '23503' }, 'DELETE');
    assert.equal(r.statusCode, 409);
    assert.equal(r.body.message, 'Dữ liệu đang được tham chiếu, không thể xóa');
  });

  for (const code of ['23502', '23514', '22P02', '22003', '22001']) {
    test(`PostgreSQL ${code} (dữ liệu không hợp lệ) → 400`, () => {
      const r = run({ code });
      assert.equal(r.statusCode, 400);
      assert.equal(r.body.message, 'Dữ liệu không hợp lệ hoặc vượt giới hạn');
    });
  }

  test('RAISE P0001 "service_id ... does not exist" → 404 Không tìm thấy dịch vụ', () => {
    const r = run({ code: 'P0001', message: 'service_id 99 does not exist' });
    assert.equal(r.statusCode, 404);
    assert.equal(r.body.message, 'Không tìm thấy dịch vụ');
  });

  test('RAISE P0001 với thông báo khác KHÔNG bị nhầm sang quy tắc trên', () => {
    const r = run({ code: 'P0001', message: 'something else' });
    assert.equal(r.statusCode, 500);
  });

  test('Lỗi có statusCode riêng → dùng statusCode đó', () => {
    const r = run(Object.assign(new Error('Xung đột'), { statusCode: 409 }));
    assert.equal(r.statusCode, 409);
    assert.equal(r.body.message, 'Xung đột');
  });

  test('Lỗi lạ không có statusCode → 500 với thông báo chung, không lộ message nội bộ', () => {
    const r = run(new Error('Rớt rồi'));
    assert.equal(r.statusCode, 500);
    assert.equal(r.body.message, 'Lỗi máy chủ nội bộ (Internal server error)');
    assert.doesNotMatch(r.body.message, /Rớt rồi/);
  });

  test('Mọi phản hồi lỗi đều có success: false', () => {
    const cases = [
      { name: 'ValidationError' }, { code: '23505' }, { code: '23503' },
      { code: '23502' }, { code: 'P0001', message: 'service_id 1 does not exist' },
      new Error('khác'),
    ];
    for (const err of cases) {
      assert.equal(run(err).body.success, false);
    }
  });
});
