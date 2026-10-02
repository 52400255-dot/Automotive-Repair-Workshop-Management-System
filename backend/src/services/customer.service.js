/**
 * customer.service — CRUD khách hàng và truy vấn xe theo khách hàng
 */
const { pool } = require('../config/db');

async function findAll() {
  const result = await pool.query(
    'SELECT id, user_id, full_name, phone, email, created_at FROM customers ORDER BY id'
  );
  return result.rows;
}

async function findById(id) {
  const result = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function create({ userId, fullName, phone, email }) {
  const result = await pool.query(
    `INSERT INTO customers (user_id, full_name, phone, email)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, fullName, phone, email]
  );
  return result.rows[0];
}

async function update(id, { fullName, phone, email }) {
  const result = await pool.query(
    `UPDATE customers
     SET full_name = COALESCE($2, full_name),
         phone = COALESCE($3, phone),
         email = COALESCE($4, email)
     WHERE id = $1
     RETURNING *`,
    [id, fullName, phone, email]
  );
  return result.rows[0] || null;
}

async function remove(id) {
  const result = await pool.query('DELETE FROM customers WHERE id = $1 RETURNING id', [id]);
  return result.rows[0] || null;
}

/** Danh sách xe của một khách hàng */
async function getVehicles(customerId) {
  const result = await pool.query(
    'SELECT * FROM vehicles WHERE customer_id = $1 ORDER BY id',
    [customerId]
  );
  return result.rows;
}

module.exports = { findAll, findById, create, update, remove, getVehicles };
