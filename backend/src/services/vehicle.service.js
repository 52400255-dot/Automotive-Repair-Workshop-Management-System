/**
 * vehicle.service — CRUD xe và lịch sử sửa chữa theo xe
 */
const { pool } = require('../config/db');

async function findAll() {
  const result = await pool.query(
    `SELECT v.*, c.full_name AS customer_name
     FROM vehicles v
     JOIN customers c ON c.id = v.customer_id
     ORDER BY v.id`
  );
  return result.rows;
}

async function findById(id) {
  const result = await pool.query('SELECT * FROM vehicles WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function create({ customerId, licensePlate, brand, model, manufactureYear }) {
  const result = await pool.query(
    `INSERT INTO vehicles (customer_id, license_plate, brand, model, manufacture_year)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [customerId, licensePlate, brand, model, manufactureYear]
  );
  return result.rows[0];
}

async function update(id, { licensePlate, brand, model, manufactureYear }) {
  const result = await pool.query(
    `UPDATE vehicles
     SET license_plate = COALESCE($2, license_plate),
         brand = COALESCE($3, brand),
         model = COALESCE($4, model),
         manufacture_year = COALESCE($5, manufacture_year)
     WHERE id = $1
     RETURNING *`,
    [id, licensePlate, brand, model, manufactureYear]
  );
  return result.rows[0] || null;
}

async function remove(id) {
  const result = await pool.query('DELETE FROM vehicles WHERE id = $1 RETURNING id', [id]);
  return result.rows[0] || null;
}


/** Lịch sử sửa chữa của xe: repair_jobs + tên khách hàng */
async function getRepairHistory(vehicleId) {
  const result = await pool.query(
    `SELECT rj.id, rj.status, rj.customer_request, rj.received_at, rj.completed_at,
            c.full_name AS customer_name
     FROM repair_jobs rj
     JOIN vehicles v ON v.id = rj.vehicle_id
     JOIN customers c ON c.id = v.customer_id
     WHERE rj.vehicle_id = $1
     ORDER BY rj.received_at DESC`,
    [vehicleId]
  );
  return result.rows;
}

module.exports = { findAll, findById, create, update, remove, getRepairHistory };
