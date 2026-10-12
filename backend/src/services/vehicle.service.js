/**
 * vehicle.service — CRUD xe và lịch sử sửa chữa theo xe
 */
const { pool } = require('../config/db');

/**
 * Danh sách xe, có thể tìm kiếm theo biển số / hãng / dòng xe / tên khách hàng (US03 — AC1).
 * @param {string} [search] - Từ khóa; để trống thì trả toàn bộ xe.
 */
async function findAll(search) {
  const keyword = (search || '').trim();
  const result = await pool.query(
    `SELECT v.*, c.full_name AS customer_name, c.phone AS customer_phone,
            jc.job_count, jc.last_received_at
     FROM vehicles v
     JOIN customers c ON c.id = v.customer_id
     LEFT JOIN LATERAL (
       SELECT count(*) AS job_count, max(rj.received_at) AS last_received_at
       FROM repair_jobs rj
       WHERE rj.vehicle_id = v.id
     ) jc ON TRUE
     WHERE ($1::TEXT IS NULL
            OR v.license_plate ILIKE '%' || $1 || '%'
            OR v.brand ILIKE '%' || $1 || '%'
            OR v.model ILIKE '%' || $1 || '%'
            OR c.full_name ILIKE '%' || $1 || '%')
     ORDER BY v.id`,
    [keyword || null]
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


/**
 * Lịch sử sửa chữa của một xe (US03 — AC2, AC3, AC4).
 * Mỗi dòng là một phiếu sửa chữa, kèm thông tin cần thiết để lễ tân đọc lại:
 * xe, khách hàng, người tiếp nhận, tình trạng, dịch vụ, phụ tùng, thợ máy, chi phí.
 * Lọc theo vehicle_id nên phiếu của xe khác không thể xuất hiện (AC5).
 */
async function getRepairHistory(vehicleId) {
  const result = await pool.query(
    `SELECT rj.id, rj.status, rj.customer_request, rj.received_at, rj.completed_at,
            v.id AS vehicle_id, v.license_plate, v.brand, v.model, v.manufacture_year,
            c.full_name AS customer_name, c.phone AS customer_phone,
            u.full_name AS receptionist_name,
            svc.services, svc.labor_total,
            pt.parts, pt.parts_total,
            mech.mechanics,
            tk.tasks,
            inv.invoice_total, inv.invoice_status
     FROM repair_jobs rj
     JOIN vehicles v ON v.id = rj.vehicle_id
     JOIN customers c ON c.id = v.customer_id
     LEFT JOIN users u ON u.id = rj.receptionist_id
     LEFT JOIN LATERAL (
       SELECT COALESCE(json_agg(json_build_object(
                'name', s.service_name, 'quantity', rd.quantity) ORDER BY s.service_name), '[]') AS services,
              COALESCE(SUM(rd.quantity * rd.unit_price_at_time), 0) AS labor_total
       FROM repair_details rd
       JOIN services s ON s.id = rd.service_id
       WHERE rd.repair_job_id = rj.id
     ) svc ON TRUE
     LEFT JOIN LATERAL (
       SELECT COALESCE(json_agg(json_build_object(
                'name', sp.part_name, 'quantity', up.quantity) ORDER BY sp.part_name), '[]') AS parts,
              COALESCE(SUM(up.quantity * up.unit_price_at_time), 0) AS parts_total
       FROM used_parts up
       JOIN spare_parts sp ON sp.id = up.spare_part_id
       WHERE up.repair_job_id = rj.id
     ) pt ON TRUE
     LEFT JOIN LATERAL (
       SELECT COALESCE(json_agg(m.full_name ORDER BY m.full_name), '[]') AS mechanics
       FROM mechanic_assignments ma
       JOIN users m ON m.id = ma.mechanic_id
       WHERE ma.repair_job_id = rj.id
     ) mech ON TRUE
     LEFT JOIN LATERAL (
       SELECT COALESCE(json_agg(json_build_object(
                'task', rt.task_name, 'status', rt.status) ORDER BY rt.id), '[]') AS tasks
       FROM repair_tasks rt
       WHERE rt.repair_job_id = rj.id
     ) tk ON TRUE
     LEFT JOIN LATERAL (
       SELECT i.total_amount AS invoice_total, i.status AS invoice_status
       FROM invoices i
       WHERE i.repair_job_id = rj.id
       ORDER BY i.id DESC
       LIMIT 1
     ) inv ON TRUE
     WHERE rj.vehicle_id = $1
     ORDER BY rj.received_at DESC`,
    [vehicleId]
  );
  return result.rows;
}

/**
 * Xe có thuộc khách hàng đang đăng nhập hay không (dùng cho Customer Portal).
 * customers.user_id chưa được liên kết trong dữ liệu mẫu nên khớp thêm theo email.
 */
async function isOwnedByUser(vehicleId, { userId, email }) {
  const result = await pool.query(
    `SELECT 1 AS ok
     FROM vehicles v
     JOIN customers c ON c.id = v.customer_id
     WHERE v.id = $1
       AND (c.user_id = $2 OR (c.email IS NOT NULL AND lower(c.email) = lower($3)))
     LIMIT 1`,
    [vehicleId, userId ?? null, email ?? '']
  );
  return Boolean(result.rows[0]);
}

module.exports = { findAll, findById, create, update, remove, getRepairHistory, isOwnedByUser };
