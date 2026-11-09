/**
 * sparePart.service — Quản lý phụ tùng, trừ kho, cảnh báo hết hàng
 */
const { pool } = require('../config/db');
const { isPositiveId } = require('../utils/workflow');

const PURCHASE_PRICE_ROLES = new Set(['warehouse_staff', 'service_manager', 'admin']);

function visiblePart(part, role) {
  if (PURCHASE_PRICE_ROLES.has(role)) return part;
  const publicPart = { ...part };
  delete publicPart.purchase_price;
  return publicPart;
}

function moneyValue(value, label) {
  const amount = Number(value);
  if (value === undefined || value === null || typeof value === 'boolean'
    || (typeof value === 'string' && !value.trim())
    || !Number.isFinite(amount) || amount < 0 || amount > 999999999999.99
    || Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-7) {
    throw Object.assign(new Error(`${label} không hợp lệ`), { statusCode: 400 });
  }
  return Math.round(amount * 100) / 100;
}

function purchasePriceValue(value) {
  const amount = moneyValue(value, 'Giá nhập');
  if (amount <= 0) throw Object.assign(new Error('Giá nhập phải lớn hơn 0'), { statusCode: 400 });
  return amount;
}

async function findAll(role) {
  const result = await pool.query('SELECT * FROM spare_parts ORDER BY id');
  return result.rows.map((part) => visiblePart(part, role));
}

async function findById(id, role) {
  const result = await pool.query('SELECT * FROM spare_parts WHERE id = $1', [id]);
  return result.rows[0] ? visiblePart(result.rows[0], role) : null;
}

async function create({ partCode, partName, unit, stockQuantity, unitPrice, purchasePrice, minStock }) {
  const repairPrice = moneyValue(unitPrice, 'Giá áp dụng sửa chữa');
  const purchaseCost = purchasePriceValue(purchasePrice);
  if (Number(stockQuantity || 0) !== 0) {
    throw Object.assign(new Error('Hãy tạo mặt hàng với tồn kho bằng 0, sau đó dùng Nhập kho để ghi nhận giá nhập và quỹ ca'), { statusCode: 400 });
  }
  const result = await pool.query(
    `INSERT INTO spare_parts (part_code, part_name, unit, stock_quantity, unit_price, purchase_price, min_stock)
     VALUES ($1, $2, COALESCE($3, 'piece'), 0, $4, $5, COALESCE($6, 0))
     RETURNING *`,
    [partCode, partName, unit, repairPrice, purchaseCost, minStock]
  );
  return result.rows[0];
}

async function update(id, data) {
  const result = await pool.query(
    `UPDATE spare_parts
     SET part_code = COALESCE($2, part_code),
         part_name = COALESCE($3, part_name),
         unit = COALESCE($4, unit),
         unit_price = COALESCE($5, unit_price),
         min_stock = COALESCE($6, min_stock),
         purchase_price = COALESCE($7, purchase_price)
     WHERE id = $1
     RETURNING *`,
    [id, data.partCode, data.partName, data.unit, data.unitPrice == null ? null : moneyValue(data.unitPrice, 'Giá áp dụng sửa chữa'), data.minStock,
      data.purchasePrice == null ? null : purchasePriceValue(data.purchasePrice)]
  );
  return result.rows[0] || null;
}

/** Phụ tùng dưới ngưỡng tồn kho tối thiểu → cảnh báo */
async function findLowStock(role) {
  const result = await pool.query(
    'SELECT * FROM spare_parts WHERE stock_quantity <= min_stock ORDER BY stock_quantity ASC'
  );
  return result.rows.map((part) => visiblePart(part, role));
}

/**
 * Trừ kho khi thợ máy ghi nhận phụ tùng đã dùng (Inventory Deduction Engine).
 * Dùng transaction + row lock (FOR UPDATE) để tránh race condition,
 * kiểm tra tồn kho trước khi trừ.
 */
async function deductForJob({ repairJobId, sparePartId, quantity, recordedBy, recordedByRole }) {
  if (!isPositiveId(repairJobId) || !isPositiveId(sparePartId)) {
    throw Object.assign(new Error('Mã phiếu sửa chữa hoặc phụ tùng không hợp lệ'), { statusCode: 400 });
  }
  if (!['number', 'string'].includes(typeof quantity) || String(quantity).trim() === '') {
    throw Object.assign(new Error('Số lượng sử dụng phải là số hợp lệ'), { statusCode: 400 });
  }
  const rawAmount = Number(quantity);
  if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
    throw Object.assign(new Error('Số lượng sử dụng phải lớn hơn 0'), { statusCode: 400 });
  }
  if (rawAmount > 9999999999.99) {
    throw Object.assign(new Error('Số lượng sử dụng vượt giới hạn cho phép'), { statusCode: 400 });
  }
  const amount = Math.round(rawAmount * 100) / 100;
  if (amount <= 0) {
    throw Object.assign(new Error('Số lượng sử dụng phải lớn hơn 0'), { statusCode: 400 });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const jobResult = await client.query(
      'SELECT id, status FROM repair_jobs WHERE id = $1 FOR UPDATE',
      [Number(repairJobId)]
    );
    const job = jobResult.rows[0];
    if (!job) {
      throw Object.assign(new Error('Không tìm thấy phiếu sửa chữa'), { statusCode: 404 });
    }
    if (job.status !== 'in_repair') {
      throw Object.assign(new Error('Chỉ được trừ phụ tùng cho phiếu đang sửa chữa'), { statusCode: 409 });
    }
    if (recordedByRole === 'mechanic') {
      const assigned = await client.query(
        `SELECT 1
         FROM mechanic_assignments ma
         WHERE ma.repair_job_id = $1
           AND ma.mechanic_id = $2
           AND ma.id = (
             SELECT latest.id
             FROM mechanic_assignments latest
             WHERE latest.repair_job_id = $1
             ORDER BY latest.assigned_at DESC, latest.id DESC
             LIMIT 1
           )
         LIMIT 1`,
        [repairJobId, recordedBy]
      );
      if (!assigned.rowCount) {
        throw Object.assign(new Error('Bạn không được phân công phiếu sửa chữa này'), { statusCode: 403 });
      }
    }

    // Khóa dòng phụ tùng để đảm bảo trừ kho tuần tự
    const partResult = await client.query(
      'SELECT * FROM spare_parts WHERE id = $1 FOR UPDATE',
      [Number(sparePartId)]
    );
    const part = partResult.rows[0];
    if (!part) {
      throw Object.assign(new Error('Không tìm thấy phụ tùng'), { statusCode: 404 });
    }
    if (Number(part.stock_quantity) < amount) {
      throw Object.assign(new Error('Kho không đủ số lượng yêu cầu'), { statusCode: 409 });
    }

    // Ghi nhận phụ tùng đã dùng vào phiếu sửa
    const used = await client.query(
      `INSERT INTO used_parts (repair_job_id, spare_part_id, quantity, unit_price_at_time)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [Number(repairJobId), Number(sparePartId), amount, part.unit_price]
    );

    // Trừ tồn kho
    await client.query(
      'UPDATE spare_parts SET stock_quantity = stock_quantity - $2 WHERE id = $1',
      [Number(sparePartId), amount]
    );

    // Ghi lịch biến động kho (export)
    await client.query(
      `INSERT INTO inventory_movements (spare_part_id, recorded_by, movement_type, quantity)
       VALUES ($1, $2, 'export', $3)`,
      [Number(sparePartId), recordedBy, amount]
    );

    await client.query('COMMIT');
    return used.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function reverseUsedPart({ usedPartId, recordedBy, recordedByRole }) {
  const fail = (statusCode, message) => { throw Object.assign(new Error(message), { statusCode }); };
  if (!isPositiveId(usedPartId)) fail(400, 'Mã phụ tùng đã dùng không hợp lệ');
  if (!['mechanic', 'warehouse_staff', 'service_manager', 'admin'].includes(recordedByRole)) {
    fail(403, 'Bạn không có quyền hoàn tác phụ tùng đã dùng');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const reference = (await client.query('SELECT repair_job_id FROM used_parts WHERE id=$1', [usedPartId])).rows[0];
    if (!reference) fail(404, 'Phụ tùng đã được thu hồi hoặc không tồn tại');

    const job = (await client.query('SELECT id, status FROM repair_jobs WHERE id=$1 FOR UPDATE', [reference.repair_job_id])).rows[0];
    if (!job) fail(404, 'Không tìm thấy phiếu sửa chữa');
    if (job.status !== 'in_repair') fail(409, 'Chỉ có thể thu hồi phụ tùng khi phiếu còn đang sửa chữa');

    if (recordedByRole === 'mechanic') {
      const assigned = await client.query(
        `SELECT 1 FROM mechanic_assignments ma
         WHERE ma.repair_job_id=$1 AND ma.mechanic_id=$2
           AND ma.id=(SELECT latest.id FROM mechanic_assignments latest
                      WHERE latest.repair_job_id=$1
                      ORDER BY latest.assigned_at DESC, latest.id DESC LIMIT 1)
         LIMIT 1`,
        [job.id, recordedBy]
      );
      if (!assigned.rowCount) fail(403, 'Chỉ thợ đang phụ trách phiếu mới được thu hồi phụ tùng');
    }

    if ((await client.query('SELECT 1 FROM invoices WHERE repair_job_id=$1 LIMIT 1', [job.id])).rowCount) {
      fail(409, 'Phiếu đã có hóa đơn, không thể thay đổi phụ tùng đã ghi nhận');
    }

    const used = (await client.query('SELECT * FROM used_parts WHERE id=$1 FOR UPDATE', [usedPartId])).rows[0];
    if (!used) fail(404, 'Phụ tùng đã được thu hồi hoặc không tồn tại');
    const part = (await client.query('SELECT id, part_name, part_code FROM spare_parts WHERE id=$1 FOR UPDATE', [used.spare_part_id])).rows[0];
    if (!part) fail(404, 'Không tìm thấy phụ tùng trong kho');

    await client.query('UPDATE spare_parts SET stock_quantity=stock_quantity+$2 WHERE id=$1', [part.id, used.quantity]);
    await client.query(
      `INSERT INTO inventory_movements
       (spare_part_id, recorded_by, movement_type, quantity, reference_type, reference_id, movement_note)
       VALUES ($1,$2,'reversal',$3,'used_part_reversal',$4,$5)`,
      [part.id, recordedBy, used.quantity, usedPartId, `Thu hồi phụ tùng đã dùng khỏi phiếu #${job.id}`]
    );
    await client.query('DELETE FROM used_parts WHERE id=$1', [usedPartId]);
    await client.query('COMMIT');
    return { id: usedPartId, repair_job_id: job.id, spare_part_id: part.id, part_name: part.part_name, part_code: part.part_code, quantity: Number(used.quantity) };
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* transaction may already be closed */ }
    throw err;
  } finally { client.release(); }
}

/** Nhập kho phụ tùng (warehouse staff) */
async function importStock({ sparePartId, quantity, purchasePrice, recordedBy }) {
  const partId = Number(sparePartId);
  const amount = Number(quantity);
  const fail = (statusCode, message) => { throw Object.assign(new Error(message), { statusCode }); };
  if (!isPositiveId(partId)) fail(400, 'Mã phụ tùng không hợp lệ');
  if (!Number.isFinite(amount) || amount <= 0 || amount > 9999999999.99) {
    fail(400, 'Số lượng nhập phải lớn hơn 0 và không vượt quá giới hạn cho phép');
  }
  const unitCost = purchasePriceValue(purchasePrice);
  const totalCost = Math.round(unitCost * amount * 100) / 100;
  if (!Number.isFinite(totalCost) || totalCost > 999999999999.99) fail(400, 'Tổng giá trị nhập vượt quá giới hạn cho phép');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const part = await client.query('SELECT id, part_name, unit, purchase_price FROM spare_parts WHERE id = $1 FOR UPDATE', [partId]);
    if (!part.rowCount) fail(404, 'Không tìm thấy phụ tùng');
    const shift = (await client.query("SELECT * FROM shifts WHERE status='open' ORDER BY id DESC LIMIT 1 FOR UPDATE")).rows[0] || null;
    let availableCash = 0;
    if (shift) {
      const cash = (await client.query(
        `SELECT COALESCE(SUM(amount) FILTER (WHERE transaction_type='inflow' AND payment_method='cash' AND approval_status='approved'),0) AS cash_in,
                COALESCE(SUM(amount) FILTER (WHERE transaction_type='outflow' AND payment_method='cash' AND approval_status='approved'),0) AS cash_out
         FROM cash_transactions WHERE shift_id=$1`, [shift.id]
      )).rows[0];
      availableCash = Math.max(0, Number(cash.cash_in) - Number(cash.cash_out));
    }
    const updated = await client.query(
      'UPDATE spare_parts SET stock_quantity = stock_quantity + $2, purchase_price=$3 WHERE id = $1 RETURNING *',
      [partId, amount, unitCost]
    );
    const movement = (await client.query(
      `INSERT INTO inventory_movements (spare_part_id, recorded_by, movement_type, quantity, purchase_unit_price)
       VALUES ($1, $2, 'import', $3, $4) RETURNING id`,
      [partId, recordedBy, amount, unitCost]
    )).rows[0];
    let payable = null;
    let paidFromShift = false;
    if (totalCost > 0) {
      payable = (await client.query(
        `INSERT INTO inventory_payables
         (inventory_movement_id, spare_part_id, source_shift_id, work_date, quantity, unit_cost, amount, created_by)
         VALUES ($1,$2,$3,COALESCE($4::date,(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bangkok')::date),$5,$6,$7,$8)
         RETURNING id, work_date, quantity, unit_cost, amount, amount_paid, status`,
        [movement.id, partId, shift?.id || null, shift?.work_date || null, amount, unitCost, totalCost, recordedBy]
      )).rows[0];
      if (shift && availableCash >= totalCost) {
        await client.query(
          `INSERT INTO cash_transactions
           (shift_id, transaction_type, category, payment_method, amount, reference_type, reference_id, description, approval_status, approved_by, approved_at, created_by)
           VALUES ($1,'outflow','inventory_import','cash',$2,'inventory_payable',$3,$4,'approved',$5,CURRENT_TIMESTAMP,$5)`,
          [shift.id, totalCost, payable.id, `Thanh toán nhập ${amount} ${part.rows[0].unit} ${part.rows[0].part_name}`, recordedBy]
        );
        payable = (await client.query(
          `UPDATE inventory_payables SET amount_paid=amount, status='paid', updated_at=CURRENT_TIMESTAMP WHERE id=$1
           RETURNING id, work_date, quantity, unit_cost, amount, amount_paid, status`, [payable.id]
        )).rows[0];
        paidFromShift = true;
      }
    }
    await client.query('COMMIT');
    return { part: updated.rows[0], payable, paidFromShift, availableCashBeforeImport: availableCash };
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* transaction may already be closed */ }
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { findAll, findById, create, update, findLowStock, deductForJob, reverseUsedPart, importStock };
