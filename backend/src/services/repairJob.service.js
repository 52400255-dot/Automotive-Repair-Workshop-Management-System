/**
 * repairJob.service — Tiếp nhận xe, tạo phiếu sửa, cập nhật trạng thái,
 * phân công thợ, ghi nhận chẩn đoán
 */
const { pool } = require('../config/db');

/** Danh sách phiếu sửa kèm thông tin xe + khách hàng */
async function findAll(status) {
  const result = await pool.query(
    `SELECT rj.*, v.license_plate, v.brand, v.model,
            c.full_name AS customer_name,
            u.full_name AS receptionist_name
     FROM repair_jobs rj
     JOIN vehicles v ON v.id = rj.vehicle_id
     JOIN customers c ON c.id = v.customer_id
     JOIN users u ON u.id = rj.receptionist_id
     WHERE ($1::VARCHAR IS NULL OR rj.status = $1)
     ORDER BY rj.received_at DESC`,
    [status || null]
  );
  return result.rows;
}

async function findById(id) {
  const result = await pool.query(
    `SELECT rj.*, v.license_plate, v.brand, v.model,
            c.full_name AS customer_name, c.phone AS customer_phone
     FROM repair_jobs rj
     JOIN vehicles v ON v.id = rj.vehicle_id
     JOIN customers c ON c.id = v.customer_id
     WHERE rj.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Lễ tân tiếp nhận xe → tạo Repair Job + các hạng mục dịch vụ (repair_details)
 * trong một transaction an toàn, thông qua stored procedure
 * create_repair_job_with_services (xem migration 014).
 *
 * serviceItems: mảng [{ serviceId, quantity }, ...]
 */
async function create({ vehicleId, receptionistId, customerRequest, serviceItems }) {
  const items = (serviceItems || []).map(item => ({
    service_id: item.serviceId,
    quantity: item.quantity,
  }));

  const result = await pool.query(
    `SELECT create_repair_job_with_services($1, $2, $3, $4::jsonb) AS id`,
    [vehicleId, receptionistId, customerRequest, JSON.stringify(items)]
  );

  return findById(result.rows[0].id);
}

/**
 * Cập nhật trạng thái phiếu sửa.
 * Nếu chuyển sang 'completed' → tự động ghi nhận completed_at.
 */
async function updateStatus(id, status) {
  const result = await pool.query(
    `UPDATE repair_jobs
     SET status = $2,
         completed_at = CASE WHEN $2 = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END
     WHERE id = $1
     RETURNING *`,
    [id, status]
  );
  return result.rows[0] || null;
}

/** Phân công thợ máy cho phiếu sửa (ghi vào mechanic_assignments + đổi status) */
async function assignMechanic({ repairJobId, mechanicId, assignedBy }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const assignment = await client.query(
      `INSERT INTO mechanic_assignments (repair_job_id, mechanic_id, assigned_by)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [repairJobId, mechanicId, assignedBy]
    );

    await client.query(
      `UPDATE repair_jobs SET status = 'diagnosing' WHERE id = $1`,
      [repairJobId]
    );

    await client.query('COMMIT');
    return assignment.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Thợ máy ghi nhận kết quả chẩn đoán */
async function addDiagnosis({ repairJobId, mechanicId, diagnosisResult, repairSuggestion }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO diagnoses (repair_job_id, mechanic_id, diagnosis_result, repair_suggestion)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [repairJobId, mechanicId, diagnosisResult, repairSuggestion]
    );

    await client.query(
      `UPDATE repair_jobs SET status = 'diagnosing' WHERE id = $1 AND status = 'pending'`,
      [repairJobId]
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Danh sách việc của một thợ máy (task board) */
async function getJobsForMechanic(mechanicId) {
  const result = await pool.query(
    `SELECT rj.*, v.license_plate, v.brand, v.model, c.full_name AS customer_name
     FROM mechanic_assignments ma
     JOIN repair_jobs rj ON rj.id = ma.repair_job_id
     JOIN vehicles v ON v.id = rj.vehicle_id
     JOIN customers c ON c.id = v.customer_id
     WHERE ma.mechanic_id = $1
       AND rj.status NOT IN ('completed', 'cancelled')
     ORDER BY rj.received_at ASC`,
    [mechanicId]
  );
  return result.rows;
}

module.exports = {
  findAll, findById, create, updateStatus,
  assignMechanic, addDiagnosis, getJobsForMechanic,
};
