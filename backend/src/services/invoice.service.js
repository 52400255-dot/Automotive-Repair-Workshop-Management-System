/**
 * invoice.service — Hóa đơn: xuất từ phiếu sửa hoàn tất, thanh toán
 * Chi phí thực tế = nhân công (từ estimate) + phụ tùng đã dùng (used_parts) + thuế VAT
 */
const { pool } = require('../config/db');
const { env } = require('../config/env');

// Ty le thue doc tu cau hinh moi truong (VAT_RATE).
// Luu y: `Number(process.env.VAT_RATE) || 0.10` da tung gien khi VAT_RATE=0
// (0 la gia tri hop le nhung bi coi la "thieu" -> roi ve 10%). env.vatRate
// dung phep thu decimal nen 0 duoc giu nguyen.
const VAT_RATE = env.vatRate;

/** Nhan dong thue trong hoa don, luon khop voi ty le dang ap dung. */
function vatLabel() {
  return `Thuế VAT (${Math.round(VAT_RATE * 100)}%)`;
}

async function findById(id) {
  const inv = await pool.query('SELECT * FROM invoices WHERE id = $1', [id]);
  if (!inv.rows[0]) return null;
  const details = await pool.query(
    'SELECT * FROM invoice_details WHERE invoice_id = $1 ORDER BY id',
    [id]
  );
  return { ...inv.rows[0], details: details.rows };
}

async function isOwnedByUser(id, userId) {
  const result = await pool.query(
    `SELECT 1
     FROM invoices i
     JOIN repair_jobs rj ON rj.id = i.repair_job_id
     JOIN vehicles v ON v.id = rj.vehicle_id
     JOIN customers c ON c.id = v.customer_id
     WHERE i.id = $1 AND c.user_id = $2
     LIMIT 1`,
    [id, userId]
  );
  return result.rowCount > 0;
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

    // Dong thue VAT — nhan duoc tinh tu ty le cau hinh, khong ghi cung "10%"
    const tax = Math.round(subtotal * VAT_RATE * 100) / 100;
    await client.query(
      `INSERT INTO invoice_details (invoice_id, description, quantity, unit_price)
       VALUES ($1, $2, 1, $3)`,
      [invoiceId, vatLabel(), tax]
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

/** Ghi nhận thanh toán toàn bộ hóa đơn → payments + invoice.status = paid */
async function markPaid(id, { amount, paymentMethod } = {}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const invoiceResult = await client.query(
      'SELECT id, total_amount, status FROM invoices WHERE id = $1 FOR UPDATE',
      [id]
    );
    const invoice = invoiceResult.rows[0];
    if (!invoice) {
      throw Object.assign(new Error('Không tìm thấy hóa đơn'), { statusCode: 404 });
    }
    if (invoice.status !== 'issued') {
      throw Object.assign(new Error('Hóa đơn không ở trạng thái chờ thanh toán'), { statusCode: 409 });
    }

    const total = Math.round(Number(invoice.total_amount) * 100);
    if (!Number.isFinite(total) || total <= 0) {
      throw Object.assign(new Error('Số tiền hóa đơn không hợp lệ'), { statusCode: 409 });
    }
    const amountValue = amount === undefined || amount === null ? total / 100 : Number(amount);
    const rawCents = amountValue * 100;
    const paidAmount = Math.round(rawCents);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      throw Object.assign(new Error('Số tiền thanh toán phải lớn hơn 0'), { statusCode: 400 });
    }
    if (Math.abs(rawCents - paidAmount) > 1e-7) {
      throw Object.assign(new Error('Số tiền thanh toán chỉ được có tối đa hai chữ số thập phân'), { statusCode: 400 });
    }
    if (paidAmount !== total) {
      throw Object.assign(new Error('Thanh toán phải bằng toàn bộ số tiền hóa đơn; chưa hỗ trợ thanh toán một phần'), { statusCode: 400 });
    }

    const method = paymentMethod || 'cash';
    if (!['cash', 'bank_transfer', 'card'].includes(method)) {
      throw Object.assign(new Error('Phương thức thanh toán không hợp lệ'), { statusCode: 400 });
    }
    const inv = await client.query(
      `UPDATE invoices SET status = 'paid'
       WHERE id = $1 AND status = 'issued'
       RETURNING *`,
      [id]
    );
    if (!inv.rows[0]) {
      throw Object.assign(new Error('Hóa đơn không ở trạng thái chờ thanh toán'), { statusCode: 409 });
    }
    await client.query(
      `INSERT INTO payments (invoice_id, amount, payment_method)
       VALUES ($1, $2, $3)`,
      [id, paidAmount / 100, method]
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

module.exports = { findById, findByJobId, isOwnedByUser, createForJob, markPaid };
