const { pool } = require('../config/db');
const notificationService = require('./notification.service');
const { validateReceptionData, normalizeServiceItems } = require('../utils/workflow');
const fail = (statusCode, message) => { throw Object.assign(new Error(message), { statusCode }); };

function idOf(value, label) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) fail(400, `${label} không hợp lệ`);
  return id;
}

function requestedDate(value) {
  if (typeof value !== 'string' || !/(Z|[+-]\d{2}:?\d{2})$/i.test(value.trim())) fail(400, 'Thời gian cần có múi giờ hợp lệ');
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) fail(400, 'Thời gian mong muốn không hợp lệ');
  if (date.getTime() <= Date.now()) fail(400, 'Không thể đặt lịch trong quá khứ');
  if (date.getTime() > Date.now() + 90 * 24 * 60 * 60 * 1000) fail(400, 'Chỉ có thể đặt lịch trong vòng 90 ngày tới');
  if (date.getUTCSeconds() !== 0 || date.getUTCMilliseconds() !== 0) fail(400, 'Giờ hẹn phải chọn theo mốc 30 phút');
  const local = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
  const [hour, minute] = local.split(':').map(Number);
  const minuteOfDay = hour * 60 + minute;
  if (minute % 30 !== 0 || minuteOfDay < 420 || minuteOfDay > 1290) fail(400, 'Giờ hẹn phải theo khung giờ gara 07:00–21:30, cách nhau 30 phút');
  return date;
}

async function getCustomerForUser(userId, db = pool) {
  const result = await db.query('SELECT id FROM customers WHERE user_id=$1', [userId]);
  if (!result.rows[0]) fail(404, 'Tài khoản chưa được liên kết với hồ sơ khách hàng');
  return result.rows[0].id;
}

async function ensureVehicleOwned(vehicleId, customerId, db = pool) {
  const result = await db.query('SELECT id, license_plate, brand, model FROM vehicles WHERE id=$1 AND customer_id=$2', [vehicleId, customerId]);
  if (!result.rows[0]) fail(404, 'Phương tiện không thuộc tài khoản khách hàng');
  return result.rows[0];
}

async function create({ userId, vehicleId, requestedFor, customerRequest }) {
  const customerId = await getCustomerForUser(userId);
  const vehicle = await ensureVehicleOwned(idOf(vehicleId, 'Mã xe'), customerId);
  const requested = requestedDate(requestedFor);
  if (typeof customerRequest !== 'string' || customerRequest.trim().length < 5 || customerRequest.trim().length > 1000) fail(400, 'Mô tả tình trạng xe phải từ 5 đến 1000 ký tự');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [`appointment-vehicle:${vehicle.id}`]);
    const existing = await client.query(`SELECT id FROM service_appointments WHERE vehicle_id=$1 AND status IN ('pending','proposed','confirmed') FOR UPDATE`, [vehicle.id]);
    if (existing.rowCount) fail(409, 'Xe này đã có một yêu cầu đặt lịch đang chờ xử lý');
    const result = await client.query(
      `INSERT INTO service_appointments (customer_id, vehicle_id, requested_by, requested_for, customer_request)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [customerId, vehicle.id, userId, requested.toISOString(), customerRequest.trim()]
    );
    const staff = await client.query("SELECT id FROM users WHERE role IN ('receptionist','service_manager','admin')");
    for (const recipient of staff.rows) {
      await notificationService.createForUser({ userId: recipient.id, eventKey: `appointment-${result.rows[0].id}-requested`, title: 'Khách gửi yêu cầu đặt lịch', message: `Yêu cầu đặt lịch mới cho xe ${vehicle.license_plate}; cần lễ tân xử lý.`, entityType: 'appointment', entityId: result.rows[0].id }, client);
    }
    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    if (err.code === '23505') fail(409, 'Xe này đã có một yêu cầu đặt lịch đang chờ xử lý');
    throw err;
  } finally { client.release(); }
}

async function listMine(userId) {
  const customerId = await getCustomerForUser(userId);
  const result = await pool.query(
    `SELECT a.*, v.license_plate, v.brand, v.model, rj.status AS repair_job_status
     FROM service_appointments a JOIN vehicles v ON v.id=a.vehicle_id
     LEFT JOIN repair_jobs rj ON rj.id=a.repair_job_id
     WHERE a.customer_id=$1 ORDER BY a.created_at DESC, a.id DESC`,
    [customerId]
  );
  return result.rows;
}

async function listQueue() {
  const result = await pool.query(
    `SELECT a.*, v.license_plate, v.brand, v.model, c.full_name AS customer_name, c.phone AS customer_phone,
            rj.status AS repair_job_status
     FROM service_appointments a JOIN vehicles v ON v.id=a.vehicle_id JOIN customers c ON c.id=a.customer_id
     LEFT JOIN repair_jobs rj ON rj.id=a.repair_job_id
     WHERE a.status IN ('pending','proposed','confirmed') ORDER BY a.requested_for, a.id`
  );
  return result.rows;
}

async function getById(id, actor) {
  const appointmentId = idOf(id, 'Mã lịch hẹn');
  const params = [appointmentId];
  let owner = '';
  if (actor.role === 'customer') { const customerId = await getCustomerForUser(actor.id); params.push(customerId); owner = ' AND a.customer_id=$2'; }
  const result = await pool.query(
    `SELECT a.*, v.license_plate, v.brand, v.model, c.full_name AS customer_name, c.phone AS customer_phone,
            rj.status AS repair_job_status FROM service_appointments a
     JOIN vehicles v ON v.id=a.vehicle_id JOIN customers c ON c.id=a.customer_id
     LEFT JOIN repair_jobs rj ON rj.id=a.repair_job_id WHERE a.id=$1${owner}`,
    params
  );
  return result.rows[0] || null;
}

async function decide({ id, status, confirmedFor, staffNote, userId, userRole }) {
  const appointmentId = idOf(id, 'Mã lịch hẹn');
  if (!['proposed','confirmed','declined'].includes(status)) fail(400, 'Quyết định lịch hẹn không hợp lệ');
  const confirmed = status === 'declined' ? null : requestedDate(confirmedFor);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const row = (await client.query('SELECT a.*, c.user_id, v.license_plate FROM service_appointments a JOIN customers c ON c.id=a.customer_id JOIN vehicles v ON v.id=a.vehicle_id WHERE a.id=$1 FOR UPDATE', [appointmentId])).rows[0];
    if (!row) fail(404, 'Không tìm thấy lịch hẹn');
    if (!['receptionist','service_manager','admin'].includes(userRole)) fail(403, 'Bạn không có quyền xử lý lịch hẹn');
    if (!['pending','proposed'].includes(row.status)) fail(409, 'Lịch hẹn đã được xử lý');
    if (status === 'proposed' && row.status !== 'pending') fail(409, 'Chỉ có thể đề xuất giờ mới cho yêu cầu chưa được xử lý');
    if (status === 'confirmed' && row.status !== 'pending') fail(409, 'Lịch đã được đề xuất giờ mới; cần chờ khách phản hồi');
    if (status === 'declined' && row.status !== 'pending') fail(409, 'Khách đang cần phản hồi giờ đề xuất trước');
    const updated = (await client.query(
      `UPDATE service_appointments SET status=$2, confirmed_for=$3, staff_note=$4, decided_by=$5, decided_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING *`,
      [appointmentId, status, confirmed?.toISOString() || null, staffNote?.trim() || null, userId]
    )).rows[0];
    const dateText = confirmed ? confirmed.toLocaleString('vi-VN', { timeZone: 'Asia/Bangkok' }) : '';
    const eventKey = status === 'proposed' ? `appointment-${appointmentId}-proposed-${Date.now()}` : `appointment-${appointmentId}-${status}`;
    await notificationService.createForUser({ userId: row.user_id, eventKey, title: status === 'declined' ? 'Lịch hẹn chưa được xác nhận' : status === 'confirmed' ? 'Lịch hẹn đã được xác nhận' : 'Gara đề xuất giờ mới', message: status === 'declined' ? 'Gara chưa thể tiếp nhận lịch hẹn này. Vui lòng gửi lại thời gian khác.' : `${status === 'confirmed' ? 'Lịch hẹn của bạn đã được xác nhận' : 'Gara đề xuất thời gian mới'}: ${dateText}.${staffNote?.trim() ? ` Ghi chú: ${staffNote.trim()}` : ''}`, entityType: 'appointment', entityId: appointmentId }, client);
    await client.query('COMMIT');
    return updated;
  } catch (err) { try { await client.query('ROLLBACK'); } catch {} throw err; }
  finally { client.release(); }
}

async function customerDecision({ id, userId, accept }) {
  if (typeof accept !== 'boolean') fail(400, 'Vui lòng chọn chấp nhận hoặc từ chối giờ đề xuất');
  const customerId = await getCustomerForUser(userId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const row = (await client.query(`SELECT a.*, v.license_plate FROM service_appointments a JOIN vehicles v ON v.id=a.vehicle_id WHERE a.id=$1 AND a.customer_id=$2 FOR UPDATE`, [idOf(id, 'Mã lịch hẹn'), customerId])).rows[0];
    if (!row) fail(404, 'Không tìm thấy lịch hẹn');
    if (row.status !== 'proposed') fail(409, 'Lịch hẹn không còn chờ bạn phản hồi');
    const status = accept ? 'confirmed' : 'declined';
    const updated = (await client.query(`UPDATE service_appointments SET status=$2, decided_by=$3, decided_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING *`, [row.id, status, userId])).rows[0];
    const staffIds = await client.query("SELECT id FROM users WHERE role IN ('receptionist','service_manager','admin')");
    for (const staff of staffIds.rows) {
      await notificationService.createForUser({ userId: staff.id, eventKey: `appointment-${row.id}-customer-${status}-${Date.now()}`, title: accept ? 'Khách đã nhận giờ hẹn' : 'Khách từ chối giờ đề xuất', message: `Khách ${accept ? 'đã xác nhận' : 'chưa chấp nhận'} lịch ${row.license_plate}.`, entityType: 'appointment', entityId: row.id }, client);
    }
    await client.query('COMMIT');
    return updated;
  } catch (err) { try { await client.query('ROLLBACK'); } catch {} throw err; }
  finally { client.release(); }
}

async function cancel(id, userId) {
  const customerId = await getCustomerForUser(userId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const row = (await client.query(`SELECT a.*, v.license_plate FROM service_appointments a JOIN vehicles v ON v.id=a.vehicle_id WHERE a.id=$1 AND a.customer_id=$2 FOR UPDATE`, [idOf(id, 'Mã lịch hẹn'), customerId])).rows[0];
    if (!row || !['pending','proposed','confirmed'].includes(row.status)) fail(409, 'Lịch hẹn không còn có thể hủy');
    const result = await client.query(`UPDATE service_appointments SET status='cancelled', decided_by=$2, decided_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING *`, [row.id, userId]);
    const staff = await client.query("SELECT id FROM users WHERE role IN ('receptionist','service_manager','admin')");
    for (const recipient of staff.rows) await notificationService.createForUser({ userId: recipient.id, eventKey: `appointment-${row.id}-cancelled`, title: 'Khách đã hủy lịch hẹn', message: `Khách đã hủy lịch tiếp nhận xe ${row.license_plate}.`, entityType: 'appointment', entityId: row.id }, client);
    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) { try { await client.query('ROLLBACK'); } catch {} throw err; }
  finally { client.release(); }
}

async function checkIn({ id, userId, userRole, customerRequest, serviceItems = [] }) {
  const appointmentId = idOf(id, 'Mã lịch hẹn');
  if (userRole !== 'receptionist') fail(403, 'Chỉ lễ tân được tiếp nhận xe từ lịch hẹn');
  const cleanRequest = typeof customerRequest === 'string' && customerRequest.trim() ? customerRequest.trim() : null;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const row = (await client.query(`SELECT a.*, c.user_id AS customer_user_id, v.license_plate FROM service_appointments a JOIN customers c ON c.id=a.customer_id JOIN vehicles v ON v.id=a.vehicle_id WHERE a.id=$1 FOR UPDATE`, [appointmentId])).rows[0];
    if (!row) fail(404, 'Không tìm thấy lịch hẹn');
    if (row.status !== 'confirmed') fail(409, 'Chỉ tiếp nhận được lịch hẹn đã xác nhận');
    const request = cleanRequest || row.customer_request;
    const validation = validateReceptionData({ vehicleId: row.vehicle_id, customerRequest: request });
    if (!validation.valid) fail(400, validation.error);
    const items = normalizeServiceItems(serviceItems).map(({ serviceId, quantity }) => ({ service_id: serviceId, quantity }));
    if (items.length) {
      const ids = [...new Set(items.map((item) => item.service_id))];
      const services = await client.query('SELECT id FROM services WHERE id=ANY($1::bigint[])', [ids]);
      if (services.rowCount !== ids.length) fail(404, 'Không tìm thấy dịch vụ');
    }
    const created = await client.query('SELECT create_repair_job_with_services($1,$2,$3,$4::jsonb) AS id', [row.vehicle_id, userId, request, JSON.stringify(items)]);
    const jobId = created.rows[0].id;
    await client.query(`UPDATE service_appointments SET status='converted', repair_job_id=$2, updated_at=CURRENT_TIMESTAMP WHERE id=$1`, [appointmentId, jobId]);
    await notificationService.createForUser({ userId: row.customer_user_id, eventKey: `repair-${jobId}-received`, title: 'Gara đã tiếp nhận xe', message: `${row.license_plate} đã được tiếp nhận. Mã phiếu sửa chữa #${jobId}.`, entityType: 'repair_job', entityId: jobId }, client);
    await client.query('COMMIT');
    return { id: jobId, appointmentId };
  } catch (err) { try { await client.query('ROLLBACK'); } catch {} throw err; }
  finally { client.release(); }
}

module.exports = { create, listMine, listQueue, getById, decide, customerDecision, cancel, checkIn, idOf, getCustomerForUser, ensureVehicleOwned };
