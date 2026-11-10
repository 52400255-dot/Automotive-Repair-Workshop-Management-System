const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const { requireDep, requireTestDbConfig, ROOT } = require('../helpers/testEnv');

const { Client } = requireDep('pg');
const bcrypt = requireDep('bcryptjs');
const PORT = Number(process.env.SHIFT_TEST_PORT || 3116);
const BASE = `http://127.0.0.1:${PORT}/api/v1`;
const SECRET = 'shift_workflow_integration_test_secret';

async function api(url, { method = 'GET', token, body } = {}) {
  const response = await fetch(BASE + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, json: await response.json() };
}

async function waitUntilUp(server) {
  for (let i = 0; i < 40; i += 1) {
    if (server.exitCode !== null) throw new Error(`Backend exited with code ${server.exitCode}`);
    try { if ((await fetch(`http://127.0.0.1:${PORT}/api/health`)).ok) return; } catch { /* server starting */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Backend did not start on ${PORT}`);
}

async function stopServer(server) {
  if (!server || server.exitCode !== null) return;
  await new Promise((resolve) => {
    const timer = setTimeout(() => { server.kill('SIGKILL'); resolve(); }, 3000);
    server.once('exit', () => { clearTimeout(timer); resolve(); });
    server.kill();
  });
}

test('US21 — mở ca, duyệt chi, tự ghi thu hóa đơn, chốt và bàn giao sang ca kế tiếp', async () => {
  const db = new Client(requireTestDbConfig());
  let server;
  let fixture;
  try {
    await db.connect();
    const suffix = randomUUID();
    const password = 'ShiftFlow!123';
    const hash = await bcrypt.hash(password, 4);
    await db.query('BEGIN');
    const actors = {};
    for (const [key, role] of [['cashier', 'receptionist'], ['manager', 'service_manager'], ['admin', 'admin'], ['mechanic', 'mechanic'], ['customer', 'customer'], ['otherCustomer', 'customer']]) {
      const result = await db.query('INSERT INTO users (full_name,email,password_hash,role) VALUES ($1,$2,$3,$4) RETURNING id', [`Shift Test ${key}`, `${key}-${suffix}@integration.test`, hash, role]);
      actors[key] = { id: result.rows[0].id, email: `${key}-${suffix}@integration.test` };
    }
    const customer = await db.query("INSERT INTO customers (user_id,full_name,phone,email) VALUES ($1,'Shift Test Customer','0912345678',$2) RETURNING id", [actors.customer.id, `customer-${suffix}@integration.test`]);
    const otherCustomer = await db.query("INSERT INTO customers (user_id,full_name,phone,email) VALUES ($1,'Other Customer','0912345679',$2) RETURNING id", [actors.otherCustomer.id, `other-customer-${suffix}@integration.test`]);
    const vehicle = await db.query("INSERT INTO vehicles (customer_id,license_plate,brand,model) VALUES ($1,$2,'Test','Cashflow') RETURNING id", [customer.rows[0].id, `T${suffix.slice(0, 7)}`]);
    const job = await db.query("INSERT INTO repair_jobs (vehicle_id,receptionist_id,customer_request,status) VALUES ($1,$2,'Shift integration fixture','completed') RETURNING id", [vehicle.rows[0].id, actors.cashier.id]);
    const invoices = [];
    for (const total of [4000000, 5000000, 500000]) {
      const invoice = await db.query("INSERT INTO invoices (repair_job_id,status,total_amount,issued_at) VALUES ($1,'issued',$2,CURRENT_TIMESTAMP) RETURNING id", [job.rows[0].id, total]);
      invoices.push({ id: invoice.rows[0].id, total });
    }
    fixture = { actors, ids: { userIds: Object.values(actors).map((actor) => actor.id), customerIds: [customer.rows[0].id, otherCustomer.rows[0].id], vehicleId: vehicle.rows[0].id, jobId: job.rows[0].id, checkInJobId: null, appointmentId: null, invoiceIds: invoices.map((invoice) => invoice.id) } };
    await db.query('COMMIT');

    const dbConfig = requireTestDbConfig();
    server = spawn(process.execPath, [path.join(ROOT, 'backend', 'src', 'server.js')], {
      cwd: path.join(ROOT, 'backend'),
      env: { ...process.env, PORT: String(PORT), DB_HOST: dbConfig.host, DB_PORT: String(dbConfig.port), DB_USER: dbConfig.user, DB_PASSWORD: dbConfig.password, DB_NAME: dbConfig.database, JWT_SECRET: SECRET },
      stdio: 'ignore',
    });
    await waitUntilUp(server);

    const tokens = {};
    for (const [key, actor] of Object.entries(actors)) {
      const login = await api('/auth/login', { method: 'POST', body: { email: actor.email, password } });
      assert.equal(login.status, 200);
      tokens[key] = login.json.data.token;
    }

    const requestedFor = new Date(Date.now() + 48 * 60 * 60 * 1000);
    requestedFor.setUTCHours(3, 0, 0, 0);
    const appointmentPayload = { vehicleId: Number(fixture.ids.vehicleId), requestedFor: requestedFor.toISOString(), customerRequest: 'Kiểm tra tiếng kêu khi phanh xe' };
    assert.equal((await api('/appointments', { method: 'POST', token: tokens.otherCustomer, body: appointmentPayload })).status, 404);
    assert.equal((await api('/appointments/mine', { token: tokens.cashier })).status, 403);
    assert.equal((await api('/appointments', { method: 'POST', token: tokens.customer, body: { ...appointmentPayload, requestedFor: 'not-a-date' } })).status, 400);
    const appointment = await api('/appointments', { method: 'POST', token: tokens.customer, body: appointmentPayload });
    assert.equal(appointment.status, 201);
    fixture.ids.appointmentId = appointment.json.data.id;
    assert.equal((await api('/appointments', { method: 'POST', token: tokens.customer, body: appointmentPayload })).status, 409);
    const proposedFor = new Date(requestedFor.getTime() + 60 * 60 * 1000);
    assert.equal((await api(`/appointments/${fixture.ids.appointmentId}/decision`, { method: 'PUT', token: tokens.cashier, body: { status: 'proposed', confirmedFor: proposedFor.toISOString(), staffNote: 'Gara còn khung giờ này' } })).status, 200);
    const appointmentList = await api('/appointments/mine', { token: tokens.customer });
    assert.equal(appointmentList.json.data[0].status, 'proposed');
    const customerDecision = await api(`/appointments/${fixture.ids.appointmentId}/customer-decision`, { method: 'POST', token: tokens.customer, body: { accept: true } });
    assert.equal(customerDecision.status, 200, JSON.stringify(customerDecision.json));
    const confirmedAppointment = await api('/appointments/mine', { token: tokens.customer });
    assert.equal(confirmedAppointment.json.data[0].status, 'confirmed');
    assert.equal((await api(`/appointments/${fixture.ids.appointmentId}/check-in`, { method: 'POST', token: tokens.customer, body: {} })).status, 403);
    const checkedIn = await api(`/appointments/${fixture.ids.appointmentId}/check-in`, { method: 'POST', token: tokens.cashier, body: {} });
    assert.equal(checkedIn.status, 201);
    fixture.ids.checkInJobId = checkedIn.json.data.id;
    assert.equal((await api(`/appointments/${fixture.ids.appointmentId}/check-in`, { method: 'POST', token: tokens.cashier, body: {} })).status, 409);
    assert.equal((await api(`/repair-jobs/${fixture.ids.checkInJobId}/assign`, { method: 'PUT', token: tokens.cashier, body: { mechanicId: Number(actors.mechanic.id) } })).status, 200);
    assert.equal((await api(`/repair-jobs/${fixture.ids.checkInJobId}/diagnosis`, { method: 'PUT', token: tokens.mechanic, body: { diagnosisResult: 'Má phanh mòn', repairSuggestion: 'Thay má phanh' } })).status, 201);
    const estimate = await api('/estimates', { method: 'POST', token: tokens.cashier, body: { repairJobId: fixture.ids.checkInJobId, items: [{ itemType: 'labor', description: 'Công thay má phanh', quantity: 1, unitPrice: 250000 }] } });
    assert.equal(estimate.status, 201);
    const estimateNotice = await api('/notifications', { token: tokens.customer });
    assert.ok(estimateNotice.json.data.some((item) => item.title === 'Gara đã gửi báo giá'));
    assert.equal((await api(`/estimates/${estimate.json.data.id}/approve`, { method: 'PUT', token: tokens.customer })).status, 200);
    assert.equal((await api(`/repair-jobs/${fixture.ids.checkInJobId}/status`, { method: 'PUT', token: tokens.mechanic, body: { status: 'in_repair' } })).status, 200);
    assert.equal((await api(`/repair-jobs/${fixture.ids.checkInJobId}/status`, { method: 'PUT', token: tokens.mechanic, body: { status: 'completed' } })).status, 200);
    const issuedInvoice = await api('/invoices', { method: 'POST', token: tokens.cashier, body: { repairJobId: fixture.ids.checkInJobId } });
    assert.equal(issuedInvoice.status, 201);
    fixture.ids.invoiceIds.push(issuedInvoice.json.data.id);
    const invoiceIssuedNotifications = await api('/notifications', { token: tokens.customer });
    assert.ok(invoiceIssuedNotifications.json.data.some((item) => item.title === 'Gara đã xuất hóa đơn'));
    const notifications = await api('/notifications', { token: tokens.customer });
    assert.ok(notifications.json.data.some((item) => item.title === 'Gara đề xuất giờ mới'));
    assert.ok(notifications.json.data.some((item) => item.title === 'Gara đã tiếp nhận xe'));
    assert.ok(notifications.json.data.some((item) => item.title === 'Xe bắt đầu được sửa chữa'));
    assert.ok(notifications.json.data.some((item) => item.title === 'Xe đã sửa xong'));
    const ownedInvoices = await api('/invoices/my', { token: tokens.customer });
    assert.equal(ownedInvoices.status, 200);
    assert.ok(ownedInvoices.json.data.some((invoice) => Number(invoice.id) === Number(invoices[0].id)));
    assert.equal((await api(`/invoices/${invoices[0].id}`, { token: tokens.mechanic })).status, 403);
    const unpaidCheckout = await api(`/invoices/${invoices[0].id}/pay`, { method: 'PUT', token: tokens.cashier, body: { amount: invoices[0].total, paymentMethod: 'cash' } });
    assert.equal(unpaidCheckout.status, 409);
    const managerCheckout = await api(`/invoices/${invoices[0].id}/pay`, { method: 'PUT', token: tokens.manager, body: { amount: invoices[0].total, paymentMethod: 'cash' } });
    assert.equal(managerCheckout.status, 403);
    const invoiceLookup = await api(`/invoices/by-job/${fixture.ids.jobId}`, { token: tokens.cashier });
    assert.equal(invoiceLookup.status, 200);
    assert.equal(invoiceLookup.json.data.status, 'issued');
    const idempotentInvoice = await api('/invoices', { method: 'POST', token: tokens.cashier, body: { repairJobId: fixture.ids.jobId } });
    assert.equal(idempotentInvoice.status, 201);
    assert.ok(invoices.some((invoice) => Number(invoice.id) === Number(idempotentInvoice.json.data.id)));
    const policy = await api('/shifts/settings', { method: 'PATCH', token: tokens.admin, body: { defaultOpeningCash: 2500000, expenseApprovalLimit: 2000000 } });
    assert.equal(policy.status, 200);
    assert.equal(Number(policy.json.data.default_opening_cash), 2500000);
    assert.equal(Number(policy.json.data.expense_approval_limit), 2000000);
    assert.equal((await api('/shifts/current', { token: tokens.mechanic })).status, 403);
    assert.equal((await api('/shifts/open', { method: 'POST', token: tokens.manager, body: { shiftName: 'ca_1', openingCash: 1 } })).status, 403);
    assert.equal((await api('/shifts/settings', { method: 'PATCH', token: tokens.manager, body: { defaultOpeningCash: 1, expenseApprovalLimit: 2 } })).status, 403);

    const opened = await api('/shifts/open', { method: 'POST', token: tokens.cashier, body: { shiftName: 'ca_1', openingCash: 3000000 } });
    assert.equal(opened.status, 201);
    const shiftId = opened.json.data.id;
    assert.equal((await api('/shifts/open', { method: 'POST', token: tokens.admin, body: { shiftName: 'ca_2', openingCash: 0 } })).status, 409);

    const smallExpense = await api('/shifts/transactions', { method: 'POST', token: tokens.cashier, body: { shiftId, category: 'spare_part_purchase', amount: 1000000, description: 'Phụ tùng thay nhanh' } });
    assert.equal(smallExpense.status, 201);
    assert.equal(smallExpense.json.data.approval_status, 'approved');
    const largeExpense = await api('/shifts/transactions', { method: 'POST', token: tokens.cashier, body: { shiftId, category: 'operational_expense', amount: 2000000, description: 'Chi phí vận hành cần duyệt' } });
    assert.equal(largeExpense.status, 201);
    assert.equal(largeExpense.json.data.approval_status, 'pending');
    assert.equal((await api('/shifts/close', { method: 'POST', token: tokens.cashier, body: { shiftId, actualCash: 4000000, reconciledBankInflow: 5000000, reconciledPosInflow: 500000 } })).status, 409);
    assert.equal((await api(`/shifts/transactions/${largeExpense.json.data.id}/decision`, { method: 'POST', token: tokens.manager, body: { approved: true } })).status, 200);

    for (const [index, paymentMethod] of ['cash', 'bank_transfer', 'card'].entries()) {
      const invoice = invoices[index];
      const paid = await api(`/invoices/${invoice.id}/pay`, { method: 'PUT', token: tokens.admin, body: { amount: invoice.total, paymentMethod, ...(paymentMethod === 'card' ? { traceCode: 'POS-TRACE-123' } : {}) } });
      assert.equal(paid.status, 200);
    }
    const jobsAfterCheckout = await api('/repair-jobs', { token: tokens.cashier });
    assert.equal(jobsAfterCheckout.status, 200);
    assert.equal(jobsAfterCheckout.json.data.find((item) => Number(item.id) === Number(fixture.ids.jobId)).invoice_status, 'paid');
    const current = await api('/shifts/current', { token: tokens.manager });
    assert.equal(current.status, 200);
    assert.equal(current.json.data.current.total_cash_inflow, 4000000);
    assert.equal(current.json.data.current.total_bank_inflow, 5000000);
    assert.equal(current.json.data.current.total_pos_inflow, 500000);
    assert.equal(current.json.data.current.total_cash_outflow, 3000000);
    assert.equal(current.json.data.current.current_cash, 4000000);
    assert.equal(current.json.data.current.cash_order_count, 1);
    assert.equal(current.json.data.current.bank_transfer_order_count, 1);
    assert.equal(current.json.data.current.pos_order_count, 1);
    assert.ok(current.json.data.current.transactions.some((transaction) => transaction.description.includes('Trace POS-TRACE-123')));
    const customerNotificationsAfterPay = await api('/notifications', { token: tokens.customer });
    assert.ok(customerNotificationsAfterPay.json.data.some((item) => item.title === 'Xe đã sẵn sàng bàn giao'));
    const receipts = await api('/invoices/my', { token: tokens.customer });
    assert.ok(receipts.json.data.find((invoice) => Number(invoice.id) === Number(invoices[0].id)).payments.some((payment) => payment.payment_method === 'cash'));

    const closed = await api('/shifts/close', { method: 'POST', token: tokens.cashier, body: {
      shiftId, actualCash: 4000000, reconciledBankInflow: 5000000, reconciledPosInflow: 500000,
    } });
    assert.equal(closed.status, 200);
    assert.equal(Number(closed.json.data.expected_closing_cash), 4000000);
    assert.equal(Number(closed.json.data.cash_difference), 0);
    assert.equal(Number(closed.json.data.deposited_cash), 1000000);
    assert.equal(Number(closed.json.data.bank_difference), 0);
    assert.equal(Number(closed.json.data.pos_difference), 0);
    const ca2 = await api('/shifts/current', { token: tokens.cashier });
    assert.deepEqual(ca2.json.data.completedShifts, ['ca_1']);
    assert.equal(ca2.json.data.suggestedOpeningCash, undefined);
    const next = await api('/shifts/open', { method: 'POST', token: tokens.cashier, body: { shiftName: 'ca_2', openingCash: ca2.json.data.settings.default_opening_cash } });
    assert.equal(next.status, 201);
    assert.equal(Number(next.json.data.opening_cash), 2500000);
    await db.query(
      `INSERT INTO cash_transactions (shift_id,transaction_type,category,payment_method,amount,description,created_by)
       VALUES ($1,'inflow','repair_payment','cash',1000000,'Ca 2 cash reconciliation fixture',$2)`,
      [next.json.data.id, fixture.actors.cashier.id]
    );
    const ca2Closed = await api('/shifts/close', { method: 'POST', token: tokens.cashier, body: {
      shiftId: next.json.data.id, actualCash: 3500000, reconciledBankInflow: 0, reconciledPosInflow: 0,
    } });
    assert.equal(ca2Closed.status, 200);
    assert.equal(Number(ca2Closed.json.data.expected_closing_cash), 3500000);
    assert.equal(Number(ca2Closed.json.data.deposited_cash), 1000000);
    assert.equal((await api('/shifts', { token: tokens.manager })).status, 200);
  } finally {
    await stopServer(server);
    if (fixture) {
      try {
        await db.query('BEGIN');
        await db.query('UPDATE shift_settings SET default_opening_cash=0, expense_approval_limit=2000000, updated_by=NULL WHERE singleton=TRUE');
        if (fixture.ids.appointmentId) await db.query('DELETE FROM service_appointments WHERE id=$1', [fixture.ids.appointmentId]);
        await db.query('DELETE FROM cash_transactions WHERE shift_id IN (SELECT id FROM shifts WHERE opened_by = ANY($1::bigint[]))', [fixture.ids.userIds]);
        await db.query('DELETE FROM shifts WHERE opened_by = ANY($1::bigint[])', [fixture.ids.userIds]);
        await db.query('DELETE FROM payments WHERE invoice_id = ANY($1::bigint[])', [fixture.ids.invoiceIds]);
        await db.query('DELETE FROM invoice_details WHERE invoice_id = ANY($1::bigint[])', [fixture.ids.invoiceIds]);
        await db.query('DELETE FROM invoices WHERE id = ANY($1::bigint[])', [fixture.ids.invoiceIds]);
        await db.query('DELETE FROM estimate_details WHERE estimate_id IN (SELECT id FROM estimates WHERE repair_job_id=ANY($1::bigint[]))', [[fixture.ids.jobId, fixture.ids.checkInJobId].filter(Boolean)]);
        await db.query('DELETE FROM estimates WHERE repair_job_id=ANY($1::bigint[])', [[fixture.ids.jobId, fixture.ids.checkInJobId].filter(Boolean)]);
        await db.query('DELETE FROM diagnoses WHERE repair_job_id=ANY($1::bigint[])', [[fixture.ids.jobId, fixture.ids.checkInJobId].filter(Boolean)]);
        await db.query('DELETE FROM mechanic_assignments WHERE repair_job_id=ANY($1::bigint[])', [[fixture.ids.jobId, fixture.ids.checkInJobId].filter(Boolean)]);
        await db.query('DELETE FROM repair_details WHERE repair_job_id=ANY($1::bigint[])', [[fixture.ids.jobId, fixture.ids.checkInJobId].filter(Boolean)]);
        await db.query('DELETE FROM repair_jobs WHERE id = ANY($1::bigint[])', [[fixture.ids.jobId, fixture.ids.checkInJobId].filter(Boolean)]);
        await db.query('DELETE FROM vehicles WHERE id = $1', [fixture.ids.vehicleId]);
        await db.query('DELETE FROM customers WHERE id = ANY($1::bigint[])', [fixture.ids.customerIds]);
        await db.query('DELETE FROM users WHERE id = ANY($1::bigint[])', [fixture.ids.userIds]);
        await db.query('COMMIT');
      } catch (error) { try { await db.query('ROLLBACK'); } catch { /* preserve cleanup failure */ } throw error; }
    }
    await db.end();
  }
});
