/**
 * auth.service — Xử lý đăng nhập, đăng ký, phân quyền
 * Tầng Service: chứa logic nghiệp vụ + truy vấn database
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_change_me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

/** Tìm user theo email (dùng cho login) */
async function findByEmail(email) {
  const result = await pool.query(
    'SELECT id, full_name, email, password_hash, role FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0] || null;
}

/** Tạo user mới — password được hash bằng bcrypt trước khi lưu */
async function createUser({ fullName, email, password, role }) {
  const passwordHash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, full_name, email, role, created_at`,
    [fullName, email, passwordHash, role]
  );
  return result.rows[0];
}

/** Kiểm tra mật khẩu khớp với hash đã lưu */
async function verifyPassword(plainPassword, passwordHash) {
  return bcrypt.compare(plainPassword, passwordHash);
}

/** Ký JWT token chứa { id, role, email } */
function generateToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
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

module.exports = { findByEmail, createUser, verifyPassword, generateToken, getProfile };
