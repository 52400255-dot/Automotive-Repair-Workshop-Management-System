/**
 * customer.service — CRUD khách hàng và truy vấn xe theo khách hàng
 */
const { pool } = require('../config/db');
const fail = (statusCode, message) => {
  throw Object.assign(new Error(message), { statusCode });
};

async function findAll() {
  const result = await pool.query(
    `SELECT id, user_id, full_name, phone, email, address, created_at
     FROM customers
     ORDER BY id`
  );

  return result.rows;
}

async function findById(id) {
  const result = await pool.query(
    'SELECT * FROM customers WHERE id = $1',
    [id]
  );

  return result.rows[0] || null;
}

async function findByUserId(userId) {
  const result = await pool.query(
    `SELECT id, user_id, full_name, phone, email, address, created_at
     FROM customers WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0] || null;
}

async function create({ userId, fullName, phone, email, address }) {
  const result = await pool.query(
    `INSERT INTO customers (
       user_id,
       full_name,
       phone,
       email,
       address
     )
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      userId || null,
      fullName,
      phone,
      email || null,
      address || null,
    ]
  );

  return result.rows[0];
}

async function update(id, { fullName, phone, email, address }) {
  const result = await pool.query(
    `UPDATE customers
     SET full_name = COALESCE($2, full_name),
         phone = COALESCE($3, phone),
         email = COALESCE($4, email),
         address = COALESCE($5, address)
     WHERE id = $1
     RETURNING *`,
    [
      id,
      fullName,
      phone,
      email,
      address,
    ]
  );

  return result.rows[0] || null;
}

async function remove(id) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const customer = (await client.query(
      'SELECT id, user_id FROM customers WHERE id = $1 FOR UPDATE',
      [id]
    )).rows[0];
    if (!customer) {
      await client.query('COMMIT');
      return null;
    }

    const vehicles = await client.query(
      'SELECT id FROM vehicles WHERE customer_id = $1 FOR UPDATE',
      [id]
    );
    if (vehicles.rowCount) {
      fail(409, 'Khách hàng vẫn còn xe. Hãy xóa các phiếu đủ điều kiện, rồi xóa xe trước.');
    }

    if (customer.user_id) {
      const account = (await client.query(
        'SELECT role FROM users WHERE id = $1 FOR UPDATE',
        [customer.user_id]
      )).rows[0];
      if (!account || account.role !== 'customer') {
        fail(409, 'Tài khoản liên kết không còn là tài khoản khách; cần kiểm tra trước khi xóa hồ sơ');
      }
      const references = await client.query(
        `SELECT EXISTS (SELECT 1 FROM repair_jobs WHERE receptionist_id = $1)
             OR EXISTS (SELECT 1 FROM diagnoses WHERE mechanic_id = $1)
             OR EXISTS (SELECT 1 FROM inventory_movements WHERE recorded_by = $1)
             OR EXISTS (SELECT 1 FROM mechanic_assignments WHERE mechanic_id = $1 OR assigned_by = $1)
           AS has_staff_history`,
        [customer.user_id]
      );
      if (references.rows[0].has_staff_history) {
        fail(409, 'Tài khoản khách đã được dùng trong lịch sử nhân viên; cần kiểm tra trước khi xóa');
      }
    }

    await client.query('DELETE FROM customers WHERE id = $1', [id]);
    if (customer.user_id) {
      await client.query('DELETE FROM users WHERE id = $1 AND role = \'customer\'', [customer.user_id]);
    }
    await client.query('COMMIT');
    return { id };
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* transaction may already be closed */ }
    throw err;
  } finally {
    client.release();
  }
}

async function getVehicles(customerId) {
  const result = await pool.query(
    'SELECT * FROM vehicles WHERE customer_id = $1 ORDER BY id',
    [customerId]
  );

  return result.rows;
}

module.exports = {
  findAll,
  findById,
  findByUserId,
  create,
  update,
  remove,
  getVehicles,
};
