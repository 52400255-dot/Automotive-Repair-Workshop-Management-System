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
 *  - Đổi role chạy trong transaction và khóa admin hiện tại để tránh hạ quyền
 *    admin cuối cùng khi có nhiều request đồng thời.
 *  - Lỗi mang statusCode (400/404/409) để errorHandler trả response nhất quán.
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
async function updateRole(id, role, actorId) {
  if (!isPositiveId(id)) fail(400, 'Mã người dùng không hợp lệ');
  if (!isAllowedRole(role)) {
    fail(400, `Vai trò không hợp lệ. Chỉ chấp nhận: ${ALLOWED_ROLES.join(', ')}`);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Lock all current admins in a stable order. Concurrent role updates then
    // re-check the admin count after the previous transaction commits.
    const admins = await client.query(
      "SELECT id FROM users WHERE role = 'admin' ORDER BY id FOR UPDATE"
    );
    const target = await client.query(
      'SELECT id, role FROM users WHERE id = $1 FOR UPDATE',
      [Number(id)]
    );
    if (!target.rows[0]) fail(404, 'Không tìm thấy người dùng');

    const isDemotingAdmin = target.rows[0].role === 'admin' && role !== 'admin';
    if (isDemotingAdmin && String(id) === String(actorId)) {
      fail(409, 'Không thể tự hạ quyền quản trị của chính mình');
    }
    if (isDemotingAdmin && admins.rows.length <= 1) {
      fail(409, 'Không thể hạ quyền quản trị viên cuối cùng');
    }

    const result = await client.query(
      `UPDATE users SET role = $2 WHERE id = $1 RETURNING ${SAFE_COLUMNS}`,
      [Number(id), role]
    );
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch { /* Preserve the original update error. */ }
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { ALLOWED_ROLES, isAllowedRole, listUsers, updateRole };
