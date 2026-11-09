const { pool } = require('../config/db');

async function createForUser({ userId, eventKey, title, message, entityType, entityId }, db = pool) {
  if (!userId || !eventKey) return null;
  const result = await db.query(
    `INSERT INTO customer_notifications (user_id, event_key, title, message, entity_type, entity_id)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (user_id, event_key) DO UPDATE SET title=EXCLUDED.title, message=EXCLUDED.message
     RETURNING *`,
    [userId, eventKey, title, message, entityType || null, entityId || null]
  );
  return result.rows[0];
}

async function notifyJobCustomer(jobId, notification, db = pool) {
  const owner = await db.query(
    `SELECT c.user_id, v.license_plate FROM repair_jobs rj
     JOIN vehicles v ON v.id=rj.vehicle_id JOIN customers c ON c.id=v.customer_id WHERE rj.id=$1`,
    [jobId]
  );
  if (!owner.rows[0]?.user_id) return null;
  return createForUser({
    userId: owner.rows[0].user_id,
    ...notification,
    message: notification.message.replaceAll('{plate}', owner.rows[0].license_plate),
  }, db);
}

async function listForUser(userId, { unreadOnly = false, limit = 30 } = {}) {
  const safeLimit = Math.min(100, Math.max(1, Math.floor(Number(limit) || 30)));
  const result = await pool.query(
    `SELECT * FROM customer_notifications
     WHERE user_id=$1 ${unreadOnly ? 'AND read_at IS NULL' : ''}
     ORDER BY created_at DESC, id DESC LIMIT $2`,
    [userId, safeLimit]
  );
  return result.rows;
}

async function markRead(id, userId) {
  const result = await pool.query(
    'UPDATE customer_notifications SET read_at=COALESCE(read_at,CURRENT_TIMESTAMP) WHERE id=$1 AND user_id=$2 RETURNING *',
    [id, userId]
  );
  return result.rows[0] || null;
}

async function markAllRead(userId) {
  const result = await pool.query('UPDATE customer_notifications SET read_at=CURRENT_TIMESTAMP WHERE user_id=$1 AND read_at IS NULL', [userId]);
  return result.rowCount;
}

module.exports = { createForUser, notifyJobCustomer, listForUser, markRead, markAllRead };
