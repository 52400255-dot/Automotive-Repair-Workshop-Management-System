const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { authorize } = require('../../backend/src/middleware/rbac');

function response() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

describe('authorize — kiểm soát quyền theo vai trò', () => {
  test('cho phép role nằm trong danh sách', () => {
    const req = { user: { id: 7, role: 'admin' } };
    const res = response();
    let nextCalls = 0;

    authorize('admin', 'service_manager')(req, res, () => { nextCalls += 1; });

    assert.equal(nextCalls, 1);
    assert.equal(res.statusCode, null);
    assert.equal(res.body, null);
  });

  test('từ chối role không được phép bằng 403', () => {
    const res = response();
    let nextCalls = 0;

    authorize('admin')({ user: { id: 8, role: 'receptionist' } }, res, () => { nextCalls += 1; });

    assert.equal(res.statusCode, 403);
    assert.equal(res.body.success, false);
    assert.equal(nextCalls, 0);
  });

  test('từ chối request chưa xác thực bằng 401', () => {
    const res = response();
    let nextCalls = 0;

    authorize('admin')({ user: null }, res, () => { nextCalls += 1; });

    assert.equal(res.statusCode, 401);
    assert.equal(res.body.success, false);
    assert.equal(nextCalls, 0);
  });
});
