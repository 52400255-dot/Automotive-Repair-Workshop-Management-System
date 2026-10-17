/**
 * service.service — Quản lý danh mục dịch vụ sửa chữa
 */
const { pool } = require('../config/db');

async function findAll() {
  const result = await pool.query(
    'SELECT id, service_code, service_name, description, standard_price, created_at FROM services ORDER BY id ASC'
  );
  return result.rows;
}

async function findById(id) {
  const result = await pool.query(
    'SELECT id, service_code, service_name, description, standard_price, created_at FROM services WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

module.exports = { findAll, findById };
