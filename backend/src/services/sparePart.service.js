/**
 * sparePart.service — Quản lý phụ tùng, trừ kho, cảnh báo hết hàng
 */
const { pool } = require('../config/db');

async function findAll() {
  const result = await pool.query('SELECT * FROM spare_parts ORDER BY id');
  return result.rows;
}

async function findById(id) {
  const result = await pool.query('SELECT * FROM spare_parts WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function create({ partCode, partName, unit, stockQuantity, unitPrice, minStock }) {
  const result = await pool.query(
    `INSERT INTO spare_parts (part_code, part_name, unit, stock_quantity, unit_price, min_stock)
     VALUES ($1, $2, COALESCE($3, 'piece'), COALESCE($4, 0), $5, COALESCE($6, 0))
     RETURNING *`,
    [partCode, partName, unit, stockQuantity, unitPrice, minStock]
  );
  return result.rows[0];
}

async function update(id, data) {
  const result = await pool.query(
    `UPDATE spare_parts
     SET part_code = COALESCE($2, part_code),
         part_name = COALESCE($3, part_name),
         unit = COALESCE($4, unit),
         stock_quantity = COALESCE($5, stock_quantity),
         unit_price = COALESCE($6, unit_price),
         min_stock = COALESCE($7, min_stock)
     WHERE id = $1
     RETURNING *`,
    [id, data.partCode, data.partName, data.unit, data.stockQuantity, data.unitPrice, data.minStock]
  );
  return result.rows[0] || null;
}

/** Phụ tùng dưới ngưỡng tồn kho tối thiểu → cảnh báo */
async function findLowStock() {
  const result = await pool.query(
    'SELECT * FROM spare_parts WHERE stock_quantity <= min_stock ORDER BY stock_quantity ASC'
  );
  return result.rows;
}

/**
 * Trừ kho khi thợ máy ghi nhận phụ tùng đã dùng (Inventory Deduction Engine).
 * Dùng transaction + row lock (FOR UPDATE) để tránh race condition,
 * kiểm tra tồn kho trước khi trừ.
 */
async function deductForJob({ repairJobId, sparePartId, quantity, recordedBy }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Khóa dòng phụ tùng để đảm bảo trừ kho tuần tự
    const partResult = await client.query(
      'SELECT * FROM spare_parts WHERE id = $1 FOR UPDATE',
      [sparePartId]
    );
    const part = partResult.rows[0];
    if (!part) {
      throw Object.assign(new Error('Không tìm thấy phụ tùng'), { statusCode: 404 });
    }
    if (Number(part.stock_quantity) < Number(quantity)) {
      throw Object.assign(new Error('Kho không đủ số lượng yêu cầu'), { statusCode: 409 });
    }

    // Ghi nhận phụ tùng đã dùng vào phiếu sửa
    const used = await client.query(
      `INSERT INTO used_parts (repair_job_id, spare_part_id, quantity, unit_price_at_time)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [repairJobId, sparePartId, quantity, part.unit_price]
    );

    // Trừ tồn kho
    await client.query(
      'UPDATE spare_parts SET stock_quantity = stock_quantity - $2 WHERE id = $1',
      [sparePartId, quantity]
    );

    // Ghi lịch biến động kho (export)
    await client.query(
      `INSERT INTO inventory_movements (spare_part_id, recorded_by, movement_type, quantity)
       VALUES ($1, $2, 'export', $3)`,
      [sparePartId, recordedBy, quantity]
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

/** Nhập kho phụ tùng (warehouse staff) */
async function importStock({ sparePartId, quantity, recordedBy }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'UPDATE spare_parts SET stock_quantity = stock_quantity + $2 WHERE id = $1',
      [sparePartId, quantity]
    );
    await client.query(
      `INSERT INTO inventory_movements (spare_part_id, recorded_by, movement_type, quantity)
       VALUES ($1, $2, 'import', $3)`,
      [sparePartId, recordedBy, quantity]
    );
    await client.query('COMMIT');
    return findById(sparePartId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { findAll, findById, create, update, findLowStock, deductForJob, importStock };
