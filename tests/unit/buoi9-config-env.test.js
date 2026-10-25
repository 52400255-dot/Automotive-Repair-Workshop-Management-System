/**
 * buoi9-config-env.test.js — Kiểm chứng Đầu việc 3 (Buổi 9): cấu hình môi trường.
 *
 * Chứng minh 2 điều:
 *   1. Bộ nạp cấu hình đọc đúng .env / biến môi trường, giữ được giá trị 0 hợp lệ
 *      và BÁO LỖI rõ ràng khi thiếu biến bắt buộc (không âm thầm dùng mật khẩu
 *      viết cứng trong mã nguồn).
 *   2. Không còn chuỗi bí mật hard-code trong các file mã nguồn đã rà soát.
 *
 * Chạy: npm test
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Đặt biến môi trường TRƯỚC khi require config/env.
// dotenv.config() không ghi đè biến đã tồn tại nên giá trị dưới đây thắng,
// giúp test không phụ thuộc .env cá nhân của người chạy.
Object.assign(process.env, {
  DB_HOST: 'unit-test-host',
  DB_PORT: '5599',
  DB_USER: 'unit_test_user',
  DB_PASSWORD: 'unit_test_password',
  DB_NAME: 'unit_test_db',
  JWT_SECRET: 'unit_test_jwt_secret',
  JWT_EXPIRES_IN: '1h',
  VAT_RATE: '0',
});

const { env, required, optional, integer, decimal } = require('../../backend/src/config/env');

describe('config/env — đọc cấu hình từ môi trường', () => {
  test('lấy giá trị từ biến môi trường thay vì hard-code', () => {
    assert.equal(env.db.host, 'unit-test-host');
    assert.equal(env.db.port, 5599);
    assert.equal(env.db.user, 'unit_test_user');
    assert.equal(env.db.password, 'unit_test_password');
    assert.equal(env.db.database, 'unit_test_db');
    assert.equal(env.jwt.secret, 'unit_test_jwt_secret');
  });

  test('VAT_RATE = 0 được giữ nguyên (lỗi `Number(x) || 0.10` không còn)', () => {
    assert.equal(env.vatRate, 0);
  });

  test('integer/decimal giữ 0 hợp lệ và chỉ dùng fallback khi thiếu biến', () => {
    process.env.TEMP_ZERO = '0';
    assert.equal(integer('TEMP_ZERO', 99), 0);
    assert.equal(decimal('TEMP_ZERO', 0.5), 0);
    assert.equal(integer('TEMP_MISSING', 99), 99);
    delete process.env.TEMP_ZERO;
  });

  test('integer/decimal báo lỗi khi giá trị không phải số', () => {
    process.env.TEMP_BAD = 'abc';
    assert.throws(() => integer('TEMP_BAD', 1), /không phải số hợp lệ/);
    assert.throws(() => decimal('TEMP_BAD', 1), /không phải số hợp lệ/);
    delete process.env.TEMP_BAD;
  });

  test('required() ném lỗi có hướng dẫn khi thiếu biến bắt buộc', () => {
    delete process.env.TEMP_ABSENT;
    assert.throws(
      () => required('TEMP_ABSENT'),
      (err) => /Thiếu biến môi trường bắt buộc "TEMP_ABSENT"/.test(err.message)
        && /\.env/.test(err.message),
    );
  });

  test('required() cắt khoảng trắng thừa', () => {
    process.env.TEMP_PADD = '  value  ';
    assert.equal(required('TEMP_PADD'), 'value');
    delete process.env.TEMP_PADD;
  });

  test('optional() trả fallback khi chuỗi rỗng', () => {
    process.env.TEMP_EMPTY = '';
    assert.equal(optional('TEMP_EMPTY', 'fb'), 'fb');
    delete process.env.TEMP_EMPTY;
  });
});

describe('Đầu việc 3 — không còn bí mật hard-code trong mã nguồn', () => {
  const ROOT = path.join(__dirname, '..', '..');
  const UNSAFE_CREDENTIAL_PATTERNS = [
    { label: 'JWT secret fallback', pattern: /JWT_SECRET\s*\|\|/i },
    { label: 'database password fallback', pattern: /DB_PASSWORD\s*\|\|/i },
    { label: 'credentials embedded in a PostgreSQL URL', pattern: /postgres(?:ql)?:\/\/[^/@\s]+:[^/@\s]+@/i },
    { label: 'literal password in SQL user/role DDL', pattern: /\b(?:CREATE|ALTER)\s+(?:USER|ROLE)\b[\s\S]*?\bPASSWORD\s+'[^']+'/i },
    { label: 'literal secret assigned to a credential variable', pattern: /\b(?:DB_PASSWORD|JWT_SECRET)\s*[:=]\s*(['"])(?!\s*\$\{)[^'"]+\1/i },
  ];
  const FILES = [
    'backend/src/config/db.js',
    'backend/src/config/env.js',
    'backend/src/middleware/auth.js',
    'backend/src/services/auth.service.js',
    'backend/src/scripts/setupDb.js',
    'docker-compose.yml',
  ];

  for (const rel of FILES) {
    test(`${rel} không dùng fallback hoặc nhúng thông tin đăng nhập`, () => {
      const content = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      for (const { label, pattern } of UNSAFE_CREDENTIAL_PATTERNS) {
        assert.doesNotMatch(content, pattern, `${rel} có ${label}`);
      }
    });
  }

  test('setupDb.js không còn danh sách mật khẩu phổ biến để thử lần lượt', () => {
    const content = fs.readFileSync(path.join(ROOT, 'backend/src/scripts/setupDb.js'), 'utf8');
    assert.doesNotMatch(content, /commonPasswords|passwordCandidates|tryPasswords/i);
  });
});
