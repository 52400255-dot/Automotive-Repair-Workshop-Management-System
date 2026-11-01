/**
 * auth.service — Xử lý đăng nhập, đăng ký, phân quyền
 * Tầng Service: chứa logic nghiệp vụ + truy vấn database
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { env } = require('../config/env');

const fail = (statusCode, message) => {
  throw Object.assign(new Error(message), { statusCode });
};

function normalizePhone(value) {
  return String(value ?? '').replace(/\D/g, '');
}

/** Tìm user theo email (dùng cho login) */
async function findByEmail(email) {
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const result = await pool.query(
    'SELECT id, full_name, email, password_hash, role FROM users WHERE lower(email) = $1',
    [normalizedEmail]
  );
  return result.rows[0] || null;
}

/**
 * Đăng ký khách hàng và liên kết tài khoản với hồ sơ/xe trong cùng transaction.
 * Hồ sơ có sẵn chỉ được liên kết khi email và số điện thoại cùng khớp.
 */
async function registerCustomer({ fullName, email, password, phone }) {
  const cleanName = typeof fullName === 'string' ? fullName.trim() : '';
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const cleanPhone = normalizePhone(phone);

  if (cleanName.length < 2 || cleanName.length > 150) {
    fail(400, 'Họ tên phải có từ 2 đến 150 ký tự');
  }
  if (cleanEmail.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    fail(400, 'Email không hợp lệ');
  }
  if (cleanPhone.length < 8 || cleanPhone.length > 15) {
    fail(400, 'Số điện thoại phải có từ 8 đến 15 chữ số');
  }
  if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    fail(400, 'Mật khẩu phải có ít nhất 8 ký tự và không vượt quá 72 byte');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Serialize registrations that claim the same email or phone.
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`customer-email:${cleanEmail}`]);
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`customer-phone:${cleanPhone}`]);

    const existingUser = await client.query(
      'SELECT id FROM users WHERE lower(email) = $1 FOR UPDATE',
      [cleanEmail]
    );
    if (existingUser.rowCount) fail(409, 'Email đã được đăng ký');

    const candidates = await client.query(
      `SELECT id, user_id, email, phone
       FROM customers
       WHERE lower(COALESCE(email, '')) = $1
          OR regexp_replace(phone, '[^0-9]', '', 'g') = $2
       ORDER BY id
       FOR UPDATE`,
      [cleanEmail, cleanPhone]
    );
    let linkedCustomer = null;
    if (candidates.rowCount) {
      const exactMatches = candidates.rows.filter((row) =>
        String(row.email ?? '').trim().toLowerCase() === cleanEmail
        && normalizePhone(row.phone) === cleanPhone
      );
      if (candidates.rowCount !== 1 || exactMatches.length !== 1) {
        fail(409, 'Email và số điện thoại chưa khớp hồ sơ khách hàng; vui lòng liên hệ lễ tân');
      }
      [linkedCustomer] = exactMatches;
      if (linkedCustomer.user_id) {
        fail(409, 'Hồ sơ khách hàng đã được liên kết với một tài khoản');
      }
    }

    const userResult = await client.query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, 'customer')
       RETURNING id, full_name, email, role, created_at`,
      [cleanName, cleanEmail, passwordHash]
    );
    const user = userResult.rows[0];

    if (linkedCustomer) {
      const linked = await client.query(
        'UPDATE customers SET user_id = $1 WHERE id = $2 AND user_id IS NULL RETURNING id',
        [user.id, linkedCustomer.id]
      );
      if (!linked.rowCount) fail(409, 'Hồ sơ khách hàng vừa được liên kết; vui lòng thử đăng nhập');
    } else {
      await client.query(
        `INSERT INTO customers (user_id, full_name, phone, email)
         VALUES ($1, $2, $3, $4)`,
        [user.id, cleanName, cleanPhone, cleanEmail]
      );
    }

    await client.query('COMMIT');
    return user;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* transaction may already be closed */ }
    if (err.code === '23505') fail(409, 'Email đã được đăng ký');
    throw err;
  } finally {
    client.release();
  }
}

/** Kiểm tra mật khẩu khớp với hash đã lưu */
async function verifyPassword(plainPassword, passwordHash) {
  return bcrypt.compare(plainPassword, passwordHash);
}

/** Ký JWT token chứa { id, role, email } */
function generateToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn }
  );
}

/** Lấy thông tin user hiện tại từ token (không trả password_hash) */
async function getProfile(userId) {
  const result = await pool.query(
    'SELECT id, full_name, email, role, created_at FROM users WHERE id = $1',
    [userId]
  );
  return result.rows[0] || null;
}

module.exports = { findByEmail, registerCustomer, verifyPassword, generateToken, getProfile };
