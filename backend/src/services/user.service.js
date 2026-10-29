/**
 * user.service — Quản lý người dùng và vai trò (US17)
 *
 * Phục vụ:
 *   GET   /api/v1/users            → listUsers()
 *   PATCH /api/v1/users/:id/role   → updateRole(id, role)
 *
 * Quy tắc bảo mật:
 *  - Mọi truy vấn dùng tham số ($1, $2), không nối chuỗi từ request.
 *  - Chỉ trả id, full_name, email, role, created_at — không bao giờ trả password_hash.
 *  - Role phải thuộc allowlist khớp CHECK constraint trong 001_init.sql.
 *  - Lỗi mang statusCode (400/404) để errorHandler trả response nhất quán.
 */
const { pool } = require('../config/db');
const { isPositiveId } = require('../utils/workflow');

/** Phải khớp CHECK (role IN (...)) trong database/migrations/001_init.sql */
const ALLOWED_ROLES = Object.freeze([
  'customer',
  'receptionist',
  'service_manager',
  'mechanic',
  'warehouse_staff',
  'admin',
]);

const SAFE_COLUMNS = 'id, full_name, email, role, created_at';

const fail = (statusCode, message) => {
  throw Object.assign(new Error(message), { statusCode });
};

function isAllowedRole(role) {
  return typeof role === 'string' && ALLOWED_ROLES.includes(role);
}

/** Danh sách người dùng (không có password_hash). */
async function listUsers() {
  const result = await pool.query(
    `SELECT ${SAFE_COLUMNS} FROM users ORDER BY id ASC`
  );
  return result.rows;
}

/**
 * Đổi vai trò của một người dùng.
 * @throws 400 nếu id/role không hợp lệ, 404 nếu user không tồn tại
 */
async function updateRole(id, role) {
  if (!isPositiveId(id)) fail(400, 'Mã người dùng không hợp lệ');
  if (!isAllowedRole(role)) {
    fail(400, `Vai trò không hợp lệ. Chỉ chấp nhận: ${ALLOWED_ROLES.join(', ')}`);
  }

  const result = await pool.query(
    `UPDATE users SET role = $2 WHERE id = $1 RETURNING ${SAFE_COLUMNS}`,
    [Number(id), role]
  );
  if (!result.rows[0]) fail(404, 'Không tìm thấy người dùng');
  return result.rows[0];
}

module.exports = { ALLOWED_ROLES, isAllowedRole, listUsers, updateRole };
