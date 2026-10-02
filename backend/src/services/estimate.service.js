/**
 * estimate.service — Báo giá: tạo, tính tiền, duyệt/từ chối
 */
const { pool } = require('../config/db');

async function findById(id) {
  const estimate = await pool.query('SELECT * FROM estimates WHERE id = $1', [id]);
  if (!estimate.rows[0]) return null;
  const details = await pool.query(
    'SELECT * FROM estimate_details WHERE estimate_id = $1 ORDER BY id',
    [id]
  );
  return { ...estimate.rows[0], details: details.rows };
}

async function findByJobId(repairJobId) {
  const result = await pool.query(
    'SELECT * FROM estimates WHERE repair_job_id = $1 ORDER BY created_at DESC',
    [repairJobId]
  );
  return result.rows[0] || null;
}

/**
 * Tạo báo giá kèm chi tiết (labor + parts).
 * Tổng tiền tự tính từ danh sách details.
 * items: [{ itemType, description, quantity, unitPrice }]
 */
async function create({ repairJobId, items }, creatorId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const total = items.reduce(
      (sum, it) => sum + Number(it.quantity) * Number(it.unitPrice), 0
    );

    const est = await client.query(
      `INSERT INTO estimates (repair_job_id, status, total_amount)
       VALUES ($1, 'sent', $2)
       RETURNING *`,
      [repairJobId, total]
    );

    for (const it of items) {
      await client.query(
        `INSERT INTO estimate_details
         (estimate_id, item_type, description, quantity, unit_price)
         VALUES ($1, $2, $3, $4, $5)`,
        [est.rows[0].id, it.itemType, it.description, it.quantity, it.unitPrice]
      );
    }

    // Phiếu sửa chuyển sang trạng thái chờ khách duyệt báo giá
    await client.query(
      `UPDATE repair_jobs SET status = 'estimated' WHERE id = $1`,
      [repairJobId]
    );

    await client.query('COMMIT');
    return findById(est.rows[0].id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Khách đồng ý báo giá → estimate.approved + job.approved */
async function approve(id) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE estimates SET status = 'approved', approved_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status = 'sent'
       RETURNING *`,
      [id]
    );
    const estimate = result.rows[0];
    if (!estimate) {
      throw Object.assign(new Error('Báo giá không tồn tại hoặc đã được xử lý'), { statusCode: 404 });
    }
    await client.query(
      `UPDATE repair_jobs SET status = 'approved' WHERE id = $1`,
      [estimate.repair_job_id]
    );
    await client.query('COMMIT');
    return findById(id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Khách từ chối báo giá → estimate.rejected + job.cancelled */
async function reject(id) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE estimates SET status = 'rejected'
       WHERE id = $1 AND status = 'sent'
       RETURNING *`,
      [id]
    );
    const estimate = result.rows[0];
    if (!estimate) {
      throw Object.assign(new Error('Báo giá không tồn tại hoặc đã được xử lý'), { statusCode: 404 });
    }
    await client.query(
      `UPDATE repair_jobs SET status = 'cancelled' WHERE id = $1`,
      [estimate.repair_job_id]
    );
    await client.query('COMMIT');
    return findById(id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { findById, findByJobId, create, approve, reject };
