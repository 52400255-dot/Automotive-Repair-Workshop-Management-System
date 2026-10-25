/**
 * auth.service — Xử lý đăng nhập, đăng ký, phân quyền
 * Tầng Service: chứa logic nghiệp vụ + truy vấn database
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { env } = require('../config/env');

/** Tìm user theo email (dùng cho login) */
async function findByEmail(email) {
  const result = await pool.query(
    'SELECT id, full_name, email, password_hash, role FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0] || null;
}

/** Tạo user mới — password được hash bằng bcrypt trước khi lưu */
async function createUser({ fullName, email, password }) {
  const passwordHash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role)
     VALUES ($1, $2, $3, 'customer')
     RETURNING id, full_name, email, role, created_at`,
    [fullName, email, passwordHash]
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

module.exports = { findByEmail, createUser, verifyPassword, generateToken, getProfile };
