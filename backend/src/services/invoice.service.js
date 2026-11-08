/**
 * invoice.service — Hóa đơn: xuất từ phiếu sửa hoàn tất, thanh toán
 * Chi phí thực tế = nhân công (từ estimate) + phụ tùng đã dùng (used_parts) + thuế VAT
 */
const { pool } = require('../config/db');
const { env } = require('../config/env');
const notificationService = require('./notification.service');

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
  const payments = await pool.query('SELECT id, amount, payment_method, paid_at FROM payments WHERE invoice_id = $1 ORDER BY paid_at, id', [id]);
  return { ...inv.rows[0], details: details.rows, payments: payments.rows };
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

async function findForCustomer(userId) {
  const result = await pool.query(
    `SELECT i.*, rj.customer_request, v.license_plate, v.brand, v.model
     FROM invoices i JOIN repair_jobs rj ON rj.id=i.repair_job_id
     JOIN vehicles v ON v.id=rj.vehicle_id JOIN customers c ON c.id=v.customer_id
     WHERE c.user_id=$1 ORDER BY i.issued_at DESC, i.id DESC`,
    [userId]
  );
  const invoices = [];
  for (const row of result.rows) {
    const details = await pool.query('SELECT * FROM invoice_details WHERE invoice_id=$1 ORDER BY id', [row.id]);
    const payments = await pool.query('SELECT id, amount, payment_method, paid_at FROM payments WHERE invoice_id=$1 ORDER BY paid_at, id', [row.id]);
    invoices.push({ ...row, details: details.rows, payments: payments.rows });
  }
  return invoices;
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
      'SELECT * FROM repair_jobs WHERE id = $1 AND status = $2 FOR UPDATE',
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
      const existingId = existing.rows[0].id;
      await client.query('COMMIT');
      return findById(existingId);
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
    if (total <= 0) {
      throw Object.assign(new Error('Hóa đơn chưa có khoản phải thu. Hãy kiểm tra báo giá đã duyệt hoặc phụ tùng đã ghi nhận trước khi xuất hóa đơn.'), { statusCode: 409 });
    }
    await client.query(
      'UPDATE invoices SET total_amount = $2 WHERE id = $1',
      [invoiceId, total]
    );

    const customer = await client.query(
      `SELECT c.user_id, v.license_plate FROM repair_jobs rj
       JOIN vehicles v ON v.id=rj.vehicle_id JOIN customers c ON c.id=v.customer_id WHERE rj.id=$1`,
      [repairJobId]
    );
    if (customer.rows[0]?.user_id) {
      await notificationService.createForUser({
        userId: customer.rows[0].user_id,
        eventKey: `invoice-${invoiceId}-issued`,
        title: 'Gara đã xuất hóa đơn',
        message: `Hóa đơn #${invoiceId} cho xe ${customer.rows[0].license_plate} đã sẵn sàng. Số tiền cần thanh toán: ${total.toLocaleString('vi-VN')} đ.`,
        entityType: 'invoice',
        entityId: invoiceId,
      }, client);
    }

    await client.query('COMMIT');
    return findById(invoiceId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function findForJob(repairJobId) {
  const result = await pool.query(
    `SELECT i.id FROM invoices i
     JOIN repair_jobs rj ON rj.id=i.repair_job_id
     WHERE i.repair_job_id=$1 AND rj.status='completed'
     ORDER BY i.issued_at DESC, i.id DESC LIMIT 1`,
    [repairJobId]
  );
  if (!result.rows[0]) return null;
  return findById(result.rows[0].id);
}

/** Ghi nhận thanh toán toàn bộ hóa đơn → payments + invoice.status = paid */
async function markPaid(id, { amount, paymentMethod, userId, traceCode } = {}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const openShift = await client.query("SELECT id FROM shifts WHERE status='open' FOR UPDATE");
    if (!openShift.rows[0]) {
      throw Object.assign(new Error('Cần mở ca làm việc trước khi ghi nhận thanh toán'), { statusCode: 409 });
    }
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
    const cleanTrace = typeof traceCode === 'string' ? traceCode.trim() : '';
    if (cleanTrace.length > 100 || (cleanTrace && !/^[\p{L}\p{N}._/-]+$/u.test(cleanTrace))) {
      throw Object.assign(new Error('Mã tham chiếu POS chỉ được chứa chữ, số và . _ / - (tối đa 100 ký tự)'), { statusCode: 400 });
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
    await client.query(
      `INSERT INTO cash_transactions
       (shift_id, transaction_type, category, payment_method, amount, reference_type, reference_id, description, approval_status, approved_by, approved_at, created_by)
       VALUES ($1, 'inflow', 'repair_payment', $2, $3, 'invoice', $4, $5, 'approved', $6, CURRENT_TIMESTAMP, $6)`,
      [openShift.rows[0].id, method === 'card' ? 'pos_card' : method, paidAmount / 100, id, `Thanh toán hóa đơn #${id}${cleanTrace ? ` · Trace ${cleanTrace}` : ''}`, userId]
    );
    const owner = (await client.query(`SELECT c.user_id, v.license_plate FROM invoices i JOIN repair_jobs rj ON rj.id=i.repair_job_id JOIN vehicles v ON v.id=rj.vehicle_id JOIN customers c ON c.id=v.customer_id WHERE i.id=$1`, [id])).rows[0];
    if (owner?.user_id) {
      await notificationService.createForUser({ userId: owner.user_id, eventKey: `invoice-${id}-paid`, title: 'Xe đã sẵn sàng bàn giao', message: `Hóa đơn #${id} của xe ${owner.license_plate} đã thanh toán thành công. Bạn có thể đến gara nhận xe.`, entityType: 'invoice', entityId: id }, client);
    }
    await client.query('COMMIT');
    return findById(id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { findById, findByJobId, findForJob, findForCustomer, isOwnedByUser, createForJob, markPaid };
