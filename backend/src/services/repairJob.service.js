/**
 * repairJob.service — Tiếp nhận xe, tạo phiếu sửa, cập nhật trạng thái,
 * phân công thợ, ghi nhận chẩn đoán
 */
const { pool } = require('../config/db');

/** Danh sách phiếu sửa kèm thông tin xe + khách hàng + thợ máy được phân công */
async function findAll(status) {
  const result = await pool.query(
    `SELECT rj.*, v.license_plate, v.brand, v.model,
            c.full_name AS customer_name,
            u.full_name AS receptionist_name,
            m.full_name AS mechanic_name,
            ma.mechanic_id
     FROM repair_jobs rj
     JOIN vehicles v ON v.id = rj.vehicle_id
     JOIN customers c ON c.id = v.customer_id
     LEFT JOIN users u ON u.id = rj.receptionist_id
     LEFT JOIN LATERAL (
       SELECT mechanic_id FROM mechanic_assignments
       WHERE repair_job_id = rj.id
       ORDER BY assigned_at DESC LIMIT 1
     ) ma ON true
     LEFT JOIN users m ON m.id = ma.mechanic_id
     WHERE ($1::VARCHAR IS NULL OR rj.status = $1)
     ORDER BY rj.received_at DESC`,
    [status || null]
  );
  return result.rows;
}

async function findById(id) {
  const result = await pool.query(
    `SELECT rj.*, v.license_plate, v.brand, v.model,
            c.full_name AS customer_name, c.phone AS customer_phone,
            u.full_name AS receptionist_name,
            m.full_name AS mechanic_name,
            ma.mechanic_id,
            d.diagnosis_result, d.repair_suggestion, d.diagnosed_at
     FROM repair_jobs rj
     JOIN vehicles v ON v.id = rj.vehicle_id
     JOIN customers c ON c.id = v.customer_id
     LEFT JOIN users u ON u.id = rj.receptionist_id
     LEFT JOIN mechanic_assignments ma ON ma.repair_job_id = rj.id
     LEFT JOIN users m ON m.id = ma.mechanic_id
     LEFT JOIN diagnoses d ON d.repair_job_id = rj.id
     WHERE rj.id = $1
     ORDER BY d.diagnosed_at DESC NULLS LAST
     LIMIT 1`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Lễ tân tiếp nhận xe → tạo Repair Job + các hạng mục dịch vụ (repair_details)
 * trong một transaction an toàn, thông qua stored procedure
 * create_repair_job_with_services (xem migration 014).
 *
 * serviceItems: mảng [{ serviceId, quantity }, ...] hoặc [1, 2]
 */
async function create({ vehicleId, receptionistId, customerRequest, serviceItems }) {
  const rawItems = serviceItems || [];
  const items = rawItems.map(item => {
    if (typeof item === 'number' || typeof item === 'string') {
      return { service_id: Number(item), quantity: 1 };
    }
    return {
      service_id: Number(item.serviceId || item.service_id || item.id),
      quantity: Number(item.quantity || 1),
    };
  }).filter(item => Boolean(item.service_id));

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
  const isCompleted = status === 'completed';
  const result = await pool.query(
    `UPDATE repair_jobs
     SET status = $2,
         completed_at = CASE WHEN $3::boolean THEN CURRENT_TIMESTAMP ELSE completed_at END
     WHERE id = $1
     RETURNING *`,
    [id, status, isCompleted]
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

async function getJobsForMechanic(mechanicId, status) {
  let innerQuery = `
    SELECT DISTINCT ON (rj.id)
           rj.*, v.license_plate, v.brand, v.model,
           c.full_name AS customer_name, c.phone AS customer_phone,
           d.diagnosis_result, d.repair_suggestion, d.diagnosed_at
    FROM mechanic_assignments ma
    JOIN repair_jobs rj ON rj.id = ma.repair_job_id
    JOIN vehicles v ON v.id = rj.vehicle_id
    JOIN customers c ON c.id = v.customer_id
    LEFT JOIN diagnoses d ON d.repair_job_id = rj.id
    WHERE ma.mechanic_id = $1
  `;
  const params = [mechanicId];

  if (status && status !== 'all') {
    innerQuery += ` AND rj.status = $2`;
    params.push(status);
  } else if (!status) {
    innerQuery += ` AND rj.status != 'cancelled'`;
  }

  innerQuery += ` ORDER BY rj.id, d.diagnosed_at DESC NULLS LAST`;

  const finalQuery = `
    SELECT * FROM (${innerQuery}) sub
    ORDER BY CASE WHEN sub.status = 'completed' THEN 2 ELSE 1 END, sub.received_at DESC
  `;

  const result = await pool.query(finalQuery, params);
  return result.rows;
}

/** Lấy danh sách kỹ thuật viên (mechanics) phục vụ phân công */
async function getMechanics() {
  const result = await pool.query(
    `SELECT id, full_name, email FROM users WHERE role = 'mechanic' ORDER BY full_name ASC`
  );
  return result.rows;
}

/** Lịch sử chẩn đoán của một phiếu */
async function getDiagnosisHistory(repairJobId) {
  const result = await pool.query(
    `SELECT d.*, u.full_name AS mechanic_name
     FROM diagnoses d
     JOIN users u ON u.id = d.mechanic_id
     WHERE d.repair_job_id = $1
     ORDER BY d.diagnosed_at DESC`,
    [repairJobId]
  );
  return result.rows;
}

module.exports = {
  findAll,
  findById,
  create,
  updateStatus,
  assignMechanic,
  addDiagnosis,
  getJobsForMechanic,
  getMechanics,
  getDiagnosisHistory,
};


