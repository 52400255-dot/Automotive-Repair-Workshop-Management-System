const { pool } = require('../config/db');

const SHIFT_RULES = { ca_1: ['07:00', '14:30'], ca_2: ['14:30', '22:30'] };
const CATEGORIES = new Set(['repair_payment', 'repair_deposit', 'spare_part_purchase', 'inventory_import', 'operational_expense', 'other']);
const METHODS = new Set(['cash', 'bank_transfer', 'pos_card']);
const fail = (statusCode, message) => { throw Object.assign(new Error(message), { statusCode }); };
const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const positiveMoney = (value, label) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 999999999999.99) fail(400, `${label} phải lớn hơn 0 và không vượt quá giới hạn cho phép`);
  if (Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-7) fail(400, `${label} chỉ được có tối đa hai chữ số thập phân`);
  return Math.round(amount * 100) / 100;
};
const nonNegativeMoney = (value, label) => {
  if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) fail(400, `${label} không hợp lệ`);
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0 || amount > 999999999999.99) fail(400, `${label} không hợp lệ`);
  if (Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-7) fail(400, `${label} chỉ được có tối đa hai chữ số thập phân`);
  return roundMoney(amount);
};
const idOf = (value, label) => {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) fail(400, `${label} không hợp lệ`);
  return id;
};

function serializeShift(row, transactions = []) {
  if (!row) return null;
  const opening = Number(row.opening_cash || 0);
  const cashIn = Number(row.total_cash_inflow || 0);
  const bankIn = Number(row.total_bank_inflow || 0);
  const posIn = Number(row.total_pos_inflow || 0);
  const cashOut = Number(row.total_cash_outflow || 0);
  return {
    ...row,
    opening_cash: opening,
    total_cash_inflow: cashIn,
    total_bank_inflow: bankIn,
    total_pos_inflow: posIn,
    total_cash_outflow: cashOut,
    cash_order_count: Number(row.cash_order_count || 0),
    bank_transfer_order_count: Number(row.bank_transfer_order_count || 0),
    pos_order_count: Number(row.pos_order_count || 0),
    current_cash: roundMoney(opening + cashIn - cashOut),
    expected_closing_cash: row.expected_closing_cash == null ? roundMoney(opening + cashIn - cashOut) : Number(row.expected_closing_cash),
    cash_difference: row.cash_difference == null ? null : Number(row.cash_difference),
    deposited_cash: row.deposited_cash == null ? null : Number(row.deposited_cash),
    bank_difference: row.bank_difference == null ? null : Number(row.bank_difference),
    pos_difference: row.pos_difference == null ? null : Number(row.pos_difference),
    reconciled_bank_inflow: row.reconciled_bank_inflow == null ? null : Number(row.reconciled_bank_inflow),
    reconciled_pos_inflow: row.reconciled_pos_inflow == null ? null : Number(row.reconciled_pos_inflow),
    transactions,
  };
}

async function getOpenShift(client = pool) {
  const result = await client.query('SELECT * FROM shifts WHERE status = \'open\' ORDER BY id DESC LIMIT 1');
  return result.rows[0] || null;
}

async function getShiftWithTransactions(id, client = pool) {
  const shift = (await client.query(`SELECT s.*, o.full_name AS opened_by_name, c.full_name AS closed_by_name FROM shifts s JOIN users o ON o.id=s.opened_by LEFT JOIN users c ON c.id=s.closed_by WHERE s.id = $1`, [id])).rows[0];
  if (!shift) return null;
  const transactions = await client.query('SELECT * FROM cash_transactions WHERE shift_id = $1 ORDER BY created_at DESC, id DESC', [id]);
  const approved = transactions.rows.filter((item) => item.approval_status === 'approved');
  const summary = {
    total_cash_inflow: roundMoney(approved.filter((item) => item.transaction_type === 'inflow' && item.payment_method === 'cash').reduce((sum, item) => sum + Number(item.amount), 0)),
    total_bank_inflow: roundMoney(approved.filter((item) => item.transaction_type === 'inflow' && item.payment_method === 'bank_transfer').reduce((sum, item) => sum + Number(item.amount), 0)),
    total_pos_inflow: roundMoney(approved.filter((item) => item.transaction_type === 'inflow' && item.payment_method === 'pos_card').reduce((sum, item) => sum + Number(item.amount), 0)),
    total_cash_outflow: roundMoney(approved.filter((item) => item.transaction_type === 'outflow' && item.payment_method === 'cash').reduce((sum, item) => sum + Number(item.amount), 0)),
    cash_order_count: approved.filter((item) => item.transaction_type === 'inflow' && item.category === 'repair_payment' && item.payment_method === 'cash').length,
    bank_transfer_order_count: approved.filter((item) => item.transaction_type === 'inflow' && item.category === 'repair_payment' && item.payment_method === 'bank_transfer').length,
    pos_order_count: approved.filter((item) => item.transaction_type === 'inflow' && item.category === 'repair_payment' && item.payment_method === 'pos_card').length,
  };
  return serializeShift({ ...shift, ...summary }, transactions.rows);
}

async function openShift({ shiftName, openingCash, userId }) {
  if (!Object.hasOwn(SHIFT_RULES, shiftName)) fail(400, 'Tên ca không hợp lệ');
  const amount = nonNegativeMoney(openingCash, 'Tiền gốc mở ca');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = await getOpenShift(client);
    if (current) fail(409, 'Hiện tại đang có ca chưa chốt, vui lòng chốt ca trước đó');
    const date = (await client.query("SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bangkok')::date AS work_date")).rows[0].work_date;
    const row = (await client.query(
      `INSERT INTO shifts (shift_name, work_date, opened_by, opening_cash)
       VALUES ($1, $2::date, $3, $4) RETURNING *`,
      [shiftName, date, userId, amount]
    )).rows[0];
    await client.query('COMMIT');
    return serializeShift(row);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* transaction may already be closed */ }
    if (err.code === '23505') fail(409, 'Ca làm việc này trong ngày đã tồn tại');
    throw err;
  } finally { client.release(); }
}

async function getCurrentShift() {
  const settings = (await pool.query('SELECT default_opening_cash, expense_approval_limit FROM shift_settings WHERE singleton=TRUE')).rows[0];
  const shift = await getOpenShift();
  if (shift) return { current: await getShiftWithTransactions(shift.id), settings };
  const completed = await pool.query(
    `SELECT shift_name FROM shifts WHERE work_date=(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bangkok')::date AND status='closed'`
  );
  return { current: null, completedShifts: completed.rows.map((row) => row.shift_name), settings };
}

async function updateSettings({ defaultOpeningCash, expenseApprovalLimit, userId }) {
  const opening = Number(defaultOpeningCash);
  const approval = Number(expenseApprovalLimit);
  const cleanOpening = nonNegativeMoney(opening, 'Tiền gốc mặc định');
  const cleanApproval = positiveMoney(approval, 'Ngưỡng duyệt chi');
  const result = await pool.query(
    `INSERT INTO shift_settings (singleton, default_opening_cash, expense_approval_limit, updated_by, updated_at)
     VALUES (TRUE,$1,$2,$3,CURRENT_TIMESTAMP)
     ON CONFLICT (singleton) DO UPDATE SET default_opening_cash=EXCLUDED.default_opening_cash,
       expense_approval_limit=EXCLUDED.expense_approval_limit, updated_by=EXCLUDED.updated_by,
       updated_at=CURRENT_TIMESTAMP
     RETURNING default_opening_cash, expense_approval_limit, updated_by, updated_at`,
    [cleanOpening, cleanApproval, userId]
  );
  return result.rows[0];
}

async function recordTransaction({ shiftId, type, category, amount, paymentMethod = 'cash', referenceType, referenceId, description, userId, approve = false, approverId }) {
  const id = idOf(shiftId, 'Mã ca');
  const value = positiveMoney(amount, 'Số tiền');
  if (!['inflow', 'outflow'].includes(type)) fail(400, 'Loại giao dịch không hợp lệ');
  if (!CATEGORIES.has(category)) fail(400, 'Nhóm giao dịch không hợp lệ');
  if (!METHODS.has(paymentMethod)) fail(400, 'Phương thức thanh toán không hợp lệ');
  if (type === 'outflow' && (!['spare_part_purchase', 'inventory_import', 'operational_expense', 'other'].includes(category) || paymentMethod !== 'cash')) fail(400, 'Phiếu chi quỹ chỉ hỗ trợ khoản chi tiền mặt');
  if (typeof description !== 'string' || !description.trim() || description.trim().length > 500) fail(400, 'Diễn giải giao dịch là bắt buộc và tối đa 500 ký tự');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const settings = (await client.query('SELECT expense_approval_limit FROM shift_settings WHERE singleton=TRUE')).rows[0];
    const needsApproval = type === 'outflow' && value >= Number(settings?.expense_approval_limit || 2000000);
    const approvalStatus = type === 'inflow' || !needsApproval || approve ? 'approved' : 'pending';
    const shift = (await client.query('SELECT id, status FROM shifts WHERE id = $1 FOR UPDATE', [id])).rows[0];
    if (!shift) fail(404, 'Không tìm thấy ca làm việc');
    if (shift.status !== 'open') fail(409, 'Ca đã chốt, không thể ghi thêm giao dịch');
    const row = (await client.query(
      `INSERT INTO cash_transactions
       (shift_id, transaction_type, category, payment_method, amount, reference_type, reference_id, description, approval_status, approved_by, approved_at, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,CASE WHEN $9::varchar = 'approved'::varchar THEN CURRENT_TIMESTAMP ELSE NULL END,$11)
       RETURNING *`,
      [id, type, category, paymentMethod, value, referenceType || null, referenceId ? idOf(referenceId, 'Mã tham chiếu') : null, description.trim(), approvalStatus, approvalStatus === 'approved' ? (approverId || userId) : null, userId]
    )).rows[0];
    await client.query('COMMIT');
    return row;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* transaction may already be closed */ }
    if (err.code === '23505') fail(409, 'Giao dịch tham chiếu này đã được ghi nhận');
    throw err;
  } finally { client.release(); }
}

async function closeShift({ shiftId, actualCash, reconciledBankInflow, reconciledPosInflow, differenceReason, notes, userId, userRole }) {
  const id = idOf(shiftId, 'Mã ca');
  const actual = nonNegativeMoney(actualCash, 'Tiền mặt kiểm kê');
  const bankChecked = nonNegativeMoney(reconciledBankInflow, 'Tiền chuyển khoản đối soát');
  const posChecked = nonNegativeMoney(reconciledPosInflow, 'Tiền ATM/POS đối soát');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const shift = (await client.query('SELECT * FROM shifts WHERE id = $1 FOR UPDATE', [id])).rows[0];
    if (!shift) fail(404, 'Không tìm thấy ca làm việc');
    if (shift.status !== 'open') fail(409, 'Ca đã được chốt trước đó');
    if (String(shift.opened_by) !== String(userId) && userRole !== 'admin') fail(403, 'Chỉ người mở ca hoặc quản trị viên được chốt ca này');
    const pending = await client.query("SELECT COUNT(*)::int AS count FROM cash_transactions WHERE shift_id=$1 AND approval_status='pending'", [id]);
    if (pending.rows[0].count) fail(409, 'Còn phiếu chi đang chờ quản lý phê duyệt; chưa thể chốt ca');
    const totals = (await client.query(
      `SELECT COALESCE(SUM(amount) FILTER (WHERE transaction_type='inflow' AND payment_method='cash' AND approval_status='approved'),0) AS cash_in,
              COALESCE(SUM(amount) FILTER (WHERE transaction_type='inflow' AND payment_method='bank_transfer' AND approval_status='approved'),0) AS bank_in,
              COALESCE(SUM(amount) FILTER (WHERE transaction_type='inflow' AND payment_method='pos_card' AND approval_status='approved'),0) AS pos_in,
              COALESCE(SUM(amount) FILTER (WHERE transaction_type='outflow' AND payment_method='cash' AND approval_status='approved'),0) AS cash_out,
              COUNT(*) FILTER (WHERE transaction_type='inflow' AND category='repair_payment' AND payment_method='cash' AND approval_status='approved')::int AS cash_orders,
              COUNT(*) FILTER (WHERE transaction_type='inflow' AND category='repair_payment' AND payment_method='bank_transfer' AND approval_status='approved')::int AS bank_orders,
              COUNT(*) FILTER (WHERE transaction_type='inflow' AND category='repair_payment' AND payment_method='pos_card' AND approval_status='approved')::int AS pos_orders
       FROM cash_transactions WHERE shift_id = $1`, [id]
    )).rows[0];
    const expected = roundMoney(Number(shift.opening_cash) + Number(totals.cash_in) - Number(totals.cash_out));
    const cashDifference = roundMoney(actual - expected);
    const bankDifference = roundMoney(bankChecked - Number(totals.bank_in));
    const posDifference = roundMoney(posChecked - Number(totals.pos_in));
    if ([cashDifference, bankDifference, posDifference].some((difference) => Math.abs(difference) > 0.009)
      && (!differenceReason || !String(differenceReason).trim())) fail(400, 'Cần giải trình khi tiền kiểm kê hoặc đối soát khác số đã ghi nhận');
    const deposited = roundMoney(Number(totals.cash_in) - Number(shift.opening_cash));
    const row = (await client.query(
      `UPDATE shifts SET status='closed', end_time=CURRENT_TIMESTAMP, closed_by=$2,
         expected_closing_cash=$3, actual_closing_cash=$4, cash_difference=$5,
         handover_cash=0, deposited_cash=$6, total_cash_inflow=$7, total_bank_inflow=$8,
         total_cash_outflow=$9, cash_breakdown=NULL, total_pos_inflow=$10,
         cash_order_count=$11, bank_transfer_order_count=$12, pos_order_count=$13,
         reconciled_bank_inflow=$14, bank_difference=$15, reconciled_pos_inflow=$16, pos_difference=$17,
         difference_reason=$18, notes=$19, updated_at=CURRENT_TIMESTAMP
       WHERE id=$1 RETURNING *`,
      [id, userId, expected, actual, cashDifference, deposited, totals.cash_in, totals.bank_in, totals.cash_out, totals.pos_in,
        totals.cash_orders, totals.bank_orders, totals.pos_orders, bankChecked, bankDifference, posChecked, posDifference,
        differenceReason?.trim() || null, notes?.trim() || null]
    )).rows[0];
    await client.query('COMMIT');
    return serializeShift(row);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* transaction may already be closed */ }
    throw err;
  } finally { client.release(); }
}

async function getHistory({ page = 1, limit = 20, fromDate, toDate }) {
  const safePage = Math.max(1, Math.floor(Number(page) || 1));
  const safeLimit = Math.min(100, Math.max(1, Math.floor(Number(limit) || 20)));
  const validDate = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
  };
  if ((fromDate && !validDate(fromDate)) || (toDate && !validDate(toDate))) fail(400, 'Khoảng ngày tra cứu không hợp lệ');
  if (fromDate && toDate && fromDate > toDate) fail(400, 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc');
  const params = [];
  const filters = ["s.status = 'closed'"];
  if (fromDate) { params.push(fromDate); filters.push(`s.work_date >= $${params.length}::date`); }
  if (toDate) { params.push(toDate); filters.push(`s.work_date <= $${params.length}::date`); }
  const count = await pool.query(`SELECT COUNT(*)::int AS total FROM shifts s WHERE ${filters.join(' AND ')}`, params);
  params.push(safeLimit, (safePage - 1) * safeLimit);
  const rows = await pool.query(`SELECT s.*, u.full_name AS opened_by_name, c.full_name AS closed_by_name FROM shifts s JOIN users u ON u.id=s.opened_by LEFT JOIN users c ON c.id=s.closed_by WHERE ${filters.join(' AND ')} ORDER BY s.work_date DESC, s.id DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
  return { data: rows.rows.map((row) => serializeShift(row)), pagination: { page: safePage, limit: safeLimit, total: count.rows[0].total, totalPages: Math.ceil(count.rows[0].total / safeLimit) } };
}

async function approveTransaction({ transactionId, userId, approved }) {
  const id = idOf(transactionId, 'Mã giao dịch');
  if (typeof approved !== 'boolean') fail(400, 'Quyết định phê duyệt không hợp lệ');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const reference = (await client.query('SELECT shift_id FROM cash_transactions WHERE id=$1', [id])).rows[0];
    if (!reference) fail(404, 'Không tìm thấy giao dịch');
    const shift = (await client.query('SELECT status FROM shifts WHERE id=$1 FOR UPDATE', [reference.shift_id])).rows[0];
    const transaction = (await client.query('SELECT * FROM cash_transactions WHERE id=$1 FOR UPDATE', [id])).rows[0];
    if (!transaction) fail(404, 'Không tìm thấy giao dịch');
    if (shift?.status !== 'open') fail(409, 'Ca đã chốt, không thể phê duyệt giao dịch');
    if (transaction.approval_status !== 'pending') fail(409, 'Giao dịch đã được xử lý');
    const row = (await client.query(`UPDATE cash_transactions SET approval_status=$2::varchar, approved_by=$3, approved_at=CASE WHEN $2::varchar='approved'::varchar THEN CURRENT_TIMESTAMP ELSE NULL END WHERE id=$1 RETURNING *`, [id, approved ? 'approved' : 'rejected', userId])).rows[0];
    await client.query('COMMIT');
    return row;
  } catch (err) { try { await client.query('ROLLBACK'); } catch {} throw err; }
  finally { client.release(); }
}

async function getSettings() {
  const result = await pool.query('SELECT default_opening_cash, expense_approval_limit, updated_by, updated_at FROM shift_settings WHERE singleton=TRUE');
  return result.rows[0] || { default_opening_cash: 0, expense_approval_limit: 2000000 };
}

module.exports = { openShift, getCurrentShift, getShiftWithTransactions, recordTransaction, closeShift, getHistory, approveTransaction, updateSettings, getSettings };
