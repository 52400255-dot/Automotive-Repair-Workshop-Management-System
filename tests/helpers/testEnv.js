/**
 * tests/helpers/testEnv.js — Đọc cấu hình database phục vụ integration test.
 *
 * Buổi 9 — bỏ hard-code: trước đây hai file integration test tự đặt mật khẩu
 * dự phòng ngay trong mã nguồn (`process.env.DB_PASSWORD || <mật khẩu cũ>`),
 * tức bí mật vẫn nằm trong file và vẫn được dùng khi thiếu cấu hình. Nay mật
 * khẩu chỉ đến từ biến môi trường hoặc file .env; thiếu thì báo lỗi rõ ràng
 * chứ không đoán.
 */
const path = require('node:path');

/** dotenv chỉ cài ở backend/, nên thử resolve từ đó nếu root không có. */
function requireDep(name) {
  try {
    return require(name);
  } catch {
    return require(path.join(__dirname, '..', '..', 'backend', 'node_modules', name));
  }
}

const fs = require('node:fs');
const ROOT = path.join(__dirname, '..', '..');

// Nap .env (goc va backend/) ma kh ghi de bien da duoc truyen ra tu shell.
for (const file of [path.join(ROOT, 'backend', '.env'), path.join(ROOT, '.env')]) {
  if (fs.existsSync(file)) {
    try {
      requireDep('dotenv').config({ path: file, quiet: true });
    } catch {
      // Khong co dotenv thi van chay duoc neu bien moi truong da duoc set san.
    }
  }
}

/**
 * Tra ve cau hinh ket noi database phuc vu test.
 * Neu thieu DB_PASSWORD thi nem loi huong dan thay vi dung mat khau cu.
 */
function requireTestDbConfig(envPrefix = 'DB') {
  const password = process.env[`${envPrefix}_PASSWORD`];
  if (!password) {
    throw new Error(
      `[test] Thiếu ${envPrefix}_PASSWORD. Hãy khai báo mật khẩu trong file .env ở thư mục gốc `
      + 'dự án (hoặc truyền biến môi trường khi chạy test), ví dụ: '
      + `${envPrefix}_PASSWORD=... npm run test:integration`
    );
  }
  return {
    host: process.env[`${envPrefix}_HOST`] || 'localhost',
    port: Number(process.env[`${envPrefix}_PORT`] || 5432),
    user: process.env[`${envPrefix}_USER`] || 'workshop_user',
    database: process.env[`${envPrefix}_NAME`] || 'workshop_db',
    password,
  };
}

module.exports = { requireTestDbConfig, requireDep, ROOT };
