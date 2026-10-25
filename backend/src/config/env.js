/**
 * config/env.js — Điểm nạp và kiểm tra cấu hình môi trường duy nhất của backend.
 *
 * Vì sao có file này?
 *  - Trước đây mật khẩu DB / JWT secret bị viết cứng (hard-code) rải rác trong
 *    db.js, auth.service.js, middleware/auth.js và setupDb.js, kèm giá trị mặc
 *    định dự phòng kiểu `Number(process.env.X) || <mat khau cu>`. Khi thiếu cấu
 *    hình, ứng dụng KHÔNG báo lỗi mà âm thầm chạy bằng mật khẩu thật nhúng
 *    trong mã nguon.
 *  - File này gom việc đọc cấu hình về một chỗ: nạp .env, ép kiểu, và báo lỗi
 *    rõ ràng khi thiếu biến bắt buộc. Mã nguon không còn chứa bí mật.
 *
 * Thứ tự ưu tiên khi nạp (vị trí sau KHÔNG ghi đè biến đã có):
 *   1. Biến môi trường thật của hệ thống / của tiến trình (Docker, CI)
 *   2. backend/.env   — cấu hình riêng của backend
 *   3. <repo>/.env    — cấu hình dùng chung cho cả docker-compose
 */
const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');

const BACKEND_ROOT = path.resolve(__dirname, '..', '..');
const PROJECT_ROOT = path.resolve(BACKEND_ROOT, '..');

const ENV_FILES = [
  path.join(BACKEND_ROOT, '.env'),
  path.join(PROJECT_ROOT, '.env'),
];

/** Nạp lần lượt các file .env tồn tại. dotenv.config không ghi đè biến đã có. */
function loadEnvFiles() {
  const loaded = [];
  for (const file of ENV_FILES) {
    if (!fs.existsSync(file)) continue;
    // quiet: dotenv tu in ra console so luong bien nap duoc, de tranh lo
    // va kh tao am thanh "mo" ve cau hinh trong log.
    dotenv.config({ path: file, quiet: true });
    loaded.push(file);
  }
  return loaded;
}

const loadedFiles = loadEnvFiles();

/**
 * Trả về chuỗi giá trị của một biến bắt buộc.
 * Thiếu biến => ném lỗi cấu hình có hướng dẫn xử lý, không dùng giá trị mặc định.
 */
function required(name) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    const nguon = loadedFiles.length ? loadedFiles.join(', ') : 'không có file .env nào';
    throw new Error(
      `[config] Thiếu biến môi trường bắt buộc "${name}". `
      + `Hãy copy backend/.env.example thành backend/.env (hoặc .env ở thư mục gốc) rồi điền giá trị của bạn. `
      + `File đã nạp: ${nguon}.`
    );
  }
  return String(raw).trim();
}

/** Biến không bắt buộc: trả về fallback khi thiếu hoặc rỗng. */
function optional(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  return String(raw).trim();
}

/**
 * Số nguyên. Khác với `Number(x) || default`: giá trị 0 hợp lệ được giữ nguyên,
 * chỉ rơi về fallback khi thiếu biến hoặc không phải số.
 */
function integer(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`[config] Biến "${name}" không phải số hợp lệ: "${raw}".`);
  }
  return Math.trunc(parsed);
}

/** Số thực, giữ cả giá trị 0 (cần cho VAT_RATE). */
function decimal(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`[config] Biến "${name}" không phải số hợp lệ: "${raw}".`);
  }
  return parsed;
}

/**
 * Cau hinh cua ung dung. Doc mot lan luc khoi dong, export ra dung chung.
 * LUU Y: khong bao gio dua gia tri cua cac bien nay vao log, bao cao
 * hoac anh chang man hinh.
 */
const env = {
  loadedFiles,
  nodeEnv: optional('NODE_ENV', ''),
  // Gi dung hanh vi cu: chi in stack trace khi NODE_ENV duoc khai bao ro
  // la 'development' (khong mac dinh 'development' khi thieu bien).
  isDevelopment: optional('NODE_ENV', '') === 'development',
  port: integer('PORT', 3000),

  db: {
    host: optional('DB_HOST', 'localhost'),
    port: integer('DB_PORT', 5432),
    user: required('DB_USER'),
    password: required('DB_PASSWORD'),
    database: required('DB_NAME'),
  },

  jwt: {
    secret: required('JWT_SECRET'),
    expiresIn: optional('JWT_EXPIRES_IN', '8h'),
  },

  vatRate: decimal('VAT_RATE', 0.10),
};

module.exports = { env, required, optional, integer, decimal };
