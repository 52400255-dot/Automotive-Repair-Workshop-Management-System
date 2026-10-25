/**
 * estimate.service — Báo giá: tạo, tính tiền, duyệt/từ chối
 */
const { pool } = require('../config/db');
const { isValidStatusTransition, validateEstimateData } = require('../utils/workflow');

const fail = (statusCode, message) => {
  throw Object.assign(new Error(message), { statusCode });
};

async function findById(id) {
  const estimate = await pool.query('SELECT * FROM estimates WHERE id = $1', [id]);
  if (!estimate.rows[0]) return null;
  const details = await pool.query(
    'SELECT * FROM estimate_details WHERE estimate_id = $1 ORDER BY id',
    [id]
  );
  return { ...estimate.rows[0], details: details.rows };
}

async function isOwnedByUser(id, userId, db = pool) {
  const result = await db.query(
    `SELECT 1
     FROM estimates e
     JOIN repair_jobs rj ON rj.id = e.repair_job_id
     JOIN vehicles v ON v.id = rj.vehicle_id
     JOIN customers c ON c.id = v.customer_id
     WHERE e.id = $1 AND c.user_id = $2
     LIMIT 1`,
    [id, userId]
  );
  return result.rowCount > 0;
}

async function requireCustomerOwnership(client, id, actor) {
  if (actor?.role === 'customer' && !(await isOwnedByUser(id, actor.id, client))) {
    throw Object.assign(new Error('Không tìm thấy báo giá'), { statusCode: 404 });
  }
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
async function create({ repairJobId, items }) {
  const validation = validateEstimateData({ repairJobId, items });
  if (!validation.valid) fail(400, validation.error);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const jobResult = await client.query(
      'SELECT id, status FROM repair_jobs WHERE id = $1 FOR UPDATE',
      [Number(repairJobId)]
    );
    const job = jobResult.rows[0];
    if (!job) fail(404, 'Không tìm thấy phiếu sửa chữa');
    if (job.status !== 'diagnosing' || !isValidStatusTransition(job.status, 'estimated')) {
      fail(409, 'Chỉ được lập báo giá cho phiếu đang chẩn đoán');
    }

    const est = await client.query(
      `INSERT INTO estimates (repair_job_id, status, total_amount)
       VALUES ($1, 'sent', $2)
       RETURNING *`,
      [Number(repairJobId), validation.totalAmount]
    );

    for (const it of validation.items) {
      await client.query(
        `INSERT INTO estimate_details
         (estimate_id, item_type, description, quantity, unit_price)
         VALUES ($1, $2, $3, $4, $5)`,
        [est.rows[0].id, it.itemType, it.description, it.quantity, it.unitPrice]
      );
    }

    // Phiếu sửa chuyển sang trạng thái chờ khách duyệt báo giá
    const updatedJob = await client.query(
      `UPDATE repair_jobs SET status = 'estimated' WHERE id = $1 AND status = 'diagnosing' RETURNING id`,
      [Number(repairJobId)]
    );
    if (!updatedJob.rowCount) fail(409, 'Phiếu sửa chữa đã thay đổi trạng thái, không thể lập báo giá');

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
async function approve(id, actor) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await requireCustomerOwnership(client, id, actor);
    const locked = await client.query(
      `SELECT e.*, rj.status AS repair_job_status
       FROM estimates e
       JOIN repair_jobs rj ON rj.id = e.repair_job_id
       WHERE e.id = $1
       FOR UPDATE OF e, rj`,
      [id]
    );
    const current = locked.rows[0];
    if (!current || current.status !== 'sent') {
      fail(404, 'Báo giá không tồn tại hoặc đã được xử lý');
    }
    if (current.repair_job_status !== 'estimated'
      || !isValidStatusTransition(current.repair_job_status, 'approved')) {
      fail(409, 'Phiếu sửa chữa không ở trạng thái chờ duyệt báo giá');
    }
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
    const updatedJob = await client.query(
      `UPDATE repair_jobs SET status = 'approved' WHERE id = $1 AND status = 'estimated' RETURNING id`,
      [estimate.repair_job_id]
    );
    if (!updatedJob.rowCount) fail(409, 'Phiếu sửa chữa đã thay đổi trạng thái, không thể duyệt báo giá');
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
async function reject(id, actor) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await requireCustomerOwnership(client, id, actor);
    const locked = await client.query(
      `SELECT e.*, rj.status AS repair_job_status
       FROM estimates e
       JOIN repair_jobs rj ON rj.id = e.repair_job_id
       WHERE e.id = $1
       FOR UPDATE OF e, rj`,
      [id]
    );
    const current = locked.rows[0];
    if (!current || current.status !== 'sent') {
      fail(404, 'Báo giá không tồn tại hoặc đã được xử lý');
    }
    if (current.repair_job_status !== 'estimated'
      || !isValidStatusTransition(current.repair_job_status, 'cancelled')) {
      fail(409, 'Phiếu sửa chữa không ở trạng thái chờ duyệt báo giá');
    }
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
    const updatedJob = await client.query(
      `UPDATE repair_jobs SET status = 'cancelled' WHERE id = $1 AND status = 'estimated' RETURNING id`,
      [estimate.repair_job_id]
    );
    if (!updatedJob.rowCount) fail(409, 'Phiếu sửa chữa đã thay đổi trạng thái, không thể từ chối báo giá');
    await client.query('COMMIT');
    return findById(id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { findById, findByJobId, isOwnedByUser, create, approve, reject };
