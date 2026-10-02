/**
 * invoice.service — Hóa đơn: xuất từ phiếu sửa hoàn tất, thanh toán
 * Chi phí thực tế = nhân công (từ estimate) + phụ tùng đã dùng (used_parts) + thuế VAT
 */
const { pool } = require('../config/db');

const VAT_RATE = Number(process.env.VAT_RATE) || 0.10; // 10% VAT

async function findById(id) {
  const inv = await pool.query('SELECT * FROM invoices WHERE id = $1', [id]);
  if (!inv.rows[0]) return null;
  const details = await pool.query(
    'SELECT * FROM invoice_details WHERE invoice_id = $1 ORDER BY id',
    [id]
  );
  return { ...inv.rows[0], details: details.rows };
}

async function findByJobId(repairJobId) {
  const result = await pool.query(
    'SELECT * FROM invoices WHERE repair_job_id = $1 ORDER BY issued_at DESC',
    [repairJobId]
  );
  return result.rows[0] || null;
}

/**
 * Xuất hóa đơn cho phiếu sửa đã hoàn thành.
 * Tự động tổng hợp: chi phí nhân công từ estimate đã duyệt
 * + toàn bộ phụ tùng đã sử dụng (used_parts) + thuế VAT.
 */
async function createForJob(repairJobId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const job = await client.query(
      'SELECT * FROM repair_jobs WHERE id = $1 AND status = $2',
      [repairJobId, 'completed']
    );
    if (!job.rows[0]) {
      throw Object.assign(new Error('Phiếu sửa chưa hoàn thành, không thể xuất hóa đơn'), { statusCode: 409 });
    }

    const existing = await client.query(
      'SELECT id FROM invoices WHERE repair_job_id = $1',
      [repairJobId]
    );
    if (existing.rows[0]) {
      throw Object.assign(new Error('Phiếu sửa đã có hóa đơn'), { statusCode: 409 });
    }

    // Lấy báo giá đã duyệt (chi phí nhân công)
    const estimate = await client.query(
      `SELECT e.* FROM estimates e
       WHERE e.repair_job_id = $1 AND e.status = 'approved'`,
      [repairJobId]
    );

    // Lấy phụ tùng đã dùng, gom theo từng loại
    const parts = await client.query(
      `SELECT sp.part_name, up.quantity, up.unit_price_at_time
       FROM used_parts up
       JOIN spare_parts sp ON sp.id = up.spare_part_id
       WHERE up.repair_job_id = $1`,
      [repairJobId]
    );

    let subtotal = 0;
    const invoice = await client.query(
      `INSERT INTO invoices (repair_job_id, estimate_id, status, total_amount, issued_at)
       VALUES ($1, $2, 'issued', 0, CURRENT_TIMESTAMP)
       RETURNING *`,
      [repairJobId, estimate.rows[0] ? estimate.rows[0].id : null]
    );
    const invoiceId = invoice.rows[0].id;

    // Dòng 1: nhân công
    if (estimate.rows[0]) {
      const labor = await client.query(
        `SELECT COALESCE(SUM(quantity * unit_price), 0) AS labor_cost
         FROM estimate_details WHERE estimate_id = $1 AND item_type = 'labor'`,
        [estimate.rows[0].id]
      );
      const laborCost = Number(labor.rows[0].labor_cost);
      if (laborCost > 0) {
        await client.query(
          `INSERT INTO invoice_details (invoice_id, description, quantity, unit_price)
           VALUES ($1, 'Chi phí nhân công', 1, $2)`,
          [invoiceId, laborCost]
        );
        subtotal += laborCost;
      }
    }

    // Các dòng: phụ tùng đã sử dụng
    for (const p of parts.rows) {
      await client.query(
        `INSERT INTO invoice_details (invoice_id, description, quantity, unit_price)
         VALUES ($1, $2, $3, $4)`,
        [invoiceId, `Phụ tùng: ${p.part_name}`, p.quantity, p.unit_price_at_time]
      );
      subtotal += Number(p.quantity) * Number(p.unit_price_at_time);
    }

    // Dòng thuế VAT
    const tax = Math.round(subtotal * VAT_RATE * 100) / 100;
    await client.query(
      `INSERT INTO invoice_details (invoice_id, description, quantity, unit_price)
       VALUES ($1, 'Thuế VAT (10%)', 1, $2)`,
      [invoiceId, tax]
    );

    const total = Math.round((subtotal + tax) * 100) / 100;
    await client.query(
      'UPDATE invoices SET total_amount = $2 WHERE id = $1',
      [invoiceId, total]
    );

    await client.query('COMMIT');
    return findById(invoiceId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Ghi nhận thanh toán → payments + invoice.status = paid */
async function markPaid(id, { amount, paymentMethod }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const inv = await client.query(
      `UPDATE invoices SET status = 'paid'
       WHERE id = $1 AND status = 'issued'
       RETURNING *`,
      [id]
    );
    if (!inv.rows[0]) {
      throw Object.assign(new Error('Hóa đơn không tồn tại hoặc đã thanh toán'), { statusCode: 404 });
    }
    await client.query(
      `INSERT INTO payments (invoice_id, amount, payment_method)
       VALUES ($1, $2, $3)`,
      [id, amount ?? inv.rows[0].total_amount, paymentMethod || 'cash']
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

module.exports = { findById, findByJobId, createForJob, markPaid };
