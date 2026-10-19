/**
 * repairJob.service — Tiếp nhận xe, tạo phiếu sửa, cập nhật trạng thái,
 * phân công thợ, ghi nhận chẩn đoán
 */
const { pool } = require('../config/db');
const { isPositiveId, normalizeServiceItems, validateReceptionData, validateDiagnosisData, isValidStatusTransition } = require('../utils/workflow');
const fail = (code, message) => { throw Object.assign(new Error(message), { statusCode: code }); };
function requireId(id) { if (!isPositiveId(id)) fail(400, 'Mã định danh không hợp lệ'); }
async function withLockedJob(id, action) {
  requireId(id);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const job = (await client.query('SELECT * FROM repair_jobs WHERE id = $1 FOR UPDATE', [id])).rows[0];
    if (!job) fail(404, 'Không tìm thấy phiếu sửa chữa');
    const assignment = (await client.query('SELECT * FROM mechanic_assignments WHERE repair_job_id = $1 ORDER BY assigned_at DESC, id DESC LIMIT 1', [id])).rows[0];
    const result = await action(client, job, assignment);
    await client.query('COMMIT');
    return result;
  } catch (err) { await client.query('ROLLBACK'); throw err; }
  finally { client.release(); }
}
function requireAssigned(assignment, mechanicId) {
  if (!assignment || String(assignment.mechanic_id) !== String(mechanicId)) fail(403, 'Bạn không phải thợ đang phụ trách phiếu');
}


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
       ORDER BY assigned_at DESC, id DESC LIMIT 1
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
     LEFT JOIN LATERAL (
       SELECT * FROM mechanic_assignments WHERE repair_job_id = rj.id
       ORDER BY assigned_at DESC, id DESC LIMIT 1
     ) ma ON true
     LEFT JOIN users m ON m.id = ma.mechanic_id
     LEFT JOIN diagnoses d ON d.repair_job_id = rj.id
     WHERE rj.id = $1
     ORDER BY d.diagnosed_at DESC NULLS LAST, d.id DESC
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
  const validation = validateReceptionData({ vehicleId, customerRequest });
  if (!validation.valid) fail(400, validation.error);
  const items = normalizeServiceItems(serviceItems).map(({ serviceId, quantity }) => ({ service_id: serviceId, quantity }));
  if (!(await pool.query('SELECT id FROM vehicles WHERE id = $1', [vehicleId])).rowCount) fail(404, 'Không tìm thấy xe');
  if (items.length) {
    const ids = [...new Set(items.map(item => item.service_id))];
    const found = await pool.query('SELECT id FROM services WHERE id = ANY($1::bigint[])', [ids]);
    if (found.rowCount !== ids.length) fail(404, 'Không tìm thấy dịch vụ');
  }
  const result = await pool.query(
    `SELECT create_repair_job_with_services($1, $2, $3, $4::jsonb) AS id`,
    [vehicleId, receptionistId, customerRequest.trim(), JSON.stringify(items)]
  );

  return findById(result.rows[0].id);
}

/**
 * Cập nhật trạng thái phiếu sửa.
 * Nếu chuyển sang 'completed' → tự động ghi nhận completed_at.
 */
async function updateStatus(id, status, actor) {
  return withLockedJob(id, async (client, job, assignment) => {
    if (actor?.role === 'mechanic') requireAssigned(assignment, actor.id);
    if (!isValidStatusTransition(job.status, status)) fail(409, 'Chuyển trạng thái không hợp lệ');
    if (job.status === status) return job;
    return (await client.query(`UPDATE repair_jobs SET status = $2,
      completed_at = CASE WHEN $3::boolean THEN CURRENT_TIMESTAMP ELSE completed_at END
      WHERE id = $1 RETURNING *`, [id, status, status === 'completed'])).rows[0];
  });
}

async function assignMechanic({ repairJobId, mechanicId, assignedBy }) {
  requireId(mechanicId);
  return withLockedJob(repairJobId, async (client, job, current) => {
    if (!['pending', 'diagnosing'].includes(job.status)) fail(409, 'Phiếu không còn ở giai đoạn phân công');
    const mechanic = (await client.query('SELECT role FROM users WHERE id = $1', [mechanicId])).rows[0];
    if (!mechanic) fail(404, 'Không tìm thấy thợ');
    if (mechanic.role !== 'mechanic') fail(400, 'Người nhận phải có vai trò thợ máy');
    if (current && String(current.mechanic_id) === String(mechanicId)) return current;
    const result = await client.query(`INSERT INTO mechanic_assignments (repair_job_id, mechanic_id, assigned_by)
      VALUES ($1, $2, $3) RETURNING *`, [repairJobId, mechanicId, assignedBy]);
    await client.query("UPDATE repair_jobs SET status = 'diagnosing' WHERE id = $1 AND status = 'pending'", [repairJobId]);
    return result.rows[0];
  });
}

async function addDiagnosis({ repairJobId, mechanicId, diagnosisResult, repairSuggestion }) {
  const validation = validateDiagnosisData({ diagnosisResult, repairSuggestion });
  if (!validation.valid) fail(400, validation.error);
  return withLockedJob(repairJobId, async (client, job, assignment) => {
    requireAssigned(assignment, mechanicId);
    if (job.status !== 'diagnosing') fail(409, 'Chỉ được chẩn đoán phiếu đang diagnosing');
    return (await client.query(`INSERT INTO diagnoses (repair_job_id, mechanic_id, diagnosis_result, repair_suggestion)
      VALUES ($1, $2, $3, $4) RETURNING *`,
      [repairJobId, mechanicId, diagnosisResult.trim(), repairSuggestion?.trim() ?? null])).rows[0];
  });
}

/** Danh sách việc của một thợ máy (task board) kèm thông tin chẩn đoán nếu đã ghi */
async function getJobsForMechanic(mechanicId, status) {
  let innerQuery = `
    SELECT DISTINCT ON (rj.id)
           rj.*, v.license_plate, v.brand, v.model,
           c.full_name AS customer_name, c.phone AS customer_phone,
           d.diagnosis_result, d.repair_suggestion, d.diagnosed_at
    FROM repair_jobs rj
    JOIN LATERAL (
      SELECT * FROM mechanic_assignments WHERE repair_job_id = rj.id
      ORDER BY assigned_at DESC, id DESC LIMIT 1
    ) ma ON true
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

  innerQuery += ` ORDER BY rj.id, d.diagnosed_at DESC NULLS LAST, d.id DESC`;

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

module.exports = {
  findAll, findById, create, updateStatus,
  assignMechanic, addDiagnosis, getJobsForMechanic, getMechanics,
};

