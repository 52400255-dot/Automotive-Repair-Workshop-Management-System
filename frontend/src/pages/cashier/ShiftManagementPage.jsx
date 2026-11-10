import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const SHIFT_OPTIONS = [
  { id: 'ca_1', label: 'Ca 1', time: '07:00–14:30' },
  { id: 'ca_2', label: 'Ca 2', time: '14:30–22:30' },
];
const CATEGORIES = [
  ['spare_part_purchase', 'Mua phụ tùng'],
  ['operational_expense', 'Chi phí vận hành'],
  ['other', 'Khoản chi khác'],
];
const money = (value) => `${Number(value || 0).toLocaleString('vi-VN')} đ`;
const roleCanOperate = (role) => ['receptionist', 'admin'].includes(role);

function Metric({ label, value, note }) {
  return <article className="shift-metric"><span>{label}</span><strong>{money(value)}</strong>{note && <small>{note}</small>}</article>;
}

function TransactionForm({ shiftId, approvalLimit, onDone, onCancel }) {
  const [form, setForm] = useState({ category: 'spare_part_purchase', amount: '', description: '', referenceType: '', referenceId: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const description = form.description.trim();
      await api.post('/shifts/transactions', {
        shiftId, category: form.category, amount: Number(form.amount), paymentMethod: 'cash', description,
        referenceType: form.referenceType || undefined, referenceId: form.referenceId || undefined,
      });
      onDone();
    } catch (err) { setError(err.response?.data?.message || 'Không ghi được phiếu chi.'); }
    finally { setBusy(false); }
  }
  return (
    <form className="shift-inline-form" onSubmit={submit}>
      <div className="shift-form-heading"><div><p className="eyebrow">Ghi nhận tiền ra</p><h2>Phiếu chi</h2></div><button className="btn btn-outline" type="button" onClick={onCancel} aria-label="Đóng">×</button></div>
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <div className="shift-form-grid">
        <div className="form-group"><label htmlFor="cash-category">Khoản chi</label><select id="cash-category" className="form-control" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATEGORIES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></div>
        <div className="form-group"><label htmlFor="cash-amount">Số tiền</label><input id="cash-amount" className="form-control" type="number" min="1" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
        <div className="form-group"><label htmlFor="cash-description">Nội dung và lý do chi</label><input id="cash-description" className="form-control" maxLength="500" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required /></div>
        <div className="form-group"><label htmlFor="cash-reference-type">Loại tham chiếu <em>(không bắt buộc)</em></label><select id="cash-reference-type" className="form-control" value={form.referenceType} onChange={(e) => setForm({ ...form, referenceType: e.target.value, referenceId: '' })}><option value="">Không liên kết</option><option value="repair_job">Phiếu sửa chữa</option><option value="spare_part">Mã phụ tùng</option></select></div>
        {form.referenceType && <div className="form-group"><label htmlFor="cash-reference-id">Mã {form.referenceType === 'repair_job' ? 'phiếu sửa chữa' : 'phụ tùng'}</label><input id="cash-reference-id" className="form-control" type="number" min="1" value={form.referenceId} onChange={(e) => setForm({ ...form, referenceId: e.target.value })} required /></div>}
      </div>
      <p className="shift-policy-note">Khoản chi từ {money(approvalLimit)} cần quản lý dịch vụ phê duyệt trước khi tính vào quỹ và chốt ca.</p>
      <div className="modal-actions"><button className="btn btn-outline" type="button" onClick={onCancel} disabled={busy}>Hủy</button><button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Đang ghi...' : 'Ghi phiếu chi'}</button></div>
    </form>
  );
}

function ManagerCashForm({ type, availableCash, onDone, onCancel }) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const isPayin = type === 'inflow';
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/shifts/cash-movements', { type, amount: Number(amount), description: description.trim() });
      onDone(isPayin ? 'Đã ghi nhận pay-in vào quỹ ca.' : 'Đã ghi nhận payout từ quỹ ca.');
    } catch (err) { setError(err.response?.data?.message || 'Không ghi được giao dịch quỹ.'); }
    finally { setBusy(false); }
  }
  return (
    <form className="shift-inline-form" onSubmit={submit}>
      <div className="shift-form-heading"><div><p className="eyebrow">{isPayin ? 'TIỀN BỔ SUNG VÀO QUỸ' : 'TIỀN CHI RA KHỎI QUỸ'}</p><h2>{isPayin ? 'Pay-in' : 'Payout'}</h2></div><button className="btn btn-outline" type="button" onClick={onCancel} aria-label="Đóng">×</button></div>
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <div className="shift-form-grid">
        <div className="form-group"><label htmlFor="manager-cash-amount">Số tiền</label><input id="manager-cash-amount" className="form-control" type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required /></div>
        <div className="form-group"><label htmlFor="manager-cash-description">Nội dung</label><input id="manager-cash-description" className="form-control" maxLength="500" value={description} onChange={(event) => setDescription(event.target.value)} required /></div>
      </div>
      <p className="shift-policy-note">{isPayin ? 'Ghi nhận tiền mặt được bổ sung trực tiếp vào quỹ ca.' : `Quỹ hiện có ${money(availableCash)}. Không thể chi vượt quá số dư.`}</p>
      <div className="modal-actions"><button className="btn btn-outline" type="button" onClick={onCancel} disabled={busy}>Hủy</button><button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Đang ghi...' : isPayin ? 'Ghi pay-in' : 'Ghi payout'}</button></div>
    </form>
  );
}

function CashPolicyForm({ settings, onSaved }) {
  const [opening, setOpening] = useState(String(settings?.default_opening_cash || 0));
  const [limit, setLimit] = useState(String(settings?.expense_approval_limit || 2000000));
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setFeedback(null);
    try {
      await api.patch('/shifts/settings', { defaultOpeningCash: Number(opening), expenseApprovalLimit: Number(limit) });
      setFeedback({ error: false, text: 'Đã lưu định mức tiền gốc và ngưỡng phê duyệt.' });
      onSaved();
    } catch (err) { setFeedback({ error: true, text: err.response?.data?.message || 'Không lưu được thiết lập.' }); }
    finally { setBusy(false); }
  }
  return (
    <details className="shift-settings">
      <summary>Thiết lập định mức ca (quản trị viên)</summary>
      <form className="shift-form-grid" onSubmit={submit}>
        <div className="form-group"><label htmlFor="default-opening-cash">Tiền gốc mặc định</label><input className="form-control" id="default-opening-cash" type="number" min="0" step="0.01" value={opening} onChange={(e) => setOpening(e.target.value)} required /></div>
        <div className="form-group"><label htmlFor="expense-approval-limit">Ngưỡng cần quản lý duyệt</label><input className="form-control" id="expense-approval-limit" type="number" min="0.01" step="0.01" value={limit} onChange={(e) => setLimit(e.target.value)} required /></div>
        {feedback && <div className={`alert ${feedback.error ? 'alert-error' : 'alert-success'} shift-wide`} role={feedback.error ? 'alert' : 'status'}>{feedback.text}</div>}
        <div className="shift-wide"><button className="btn btn-outline" type="submit" disabled={busy}>{busy ? 'Đang lưu...' : 'Lưu thiết lập'}</button></div>
      </form>
    </details>
  );
}

function CloseShiftForm({ shift, onDone, onCancel }) {
  const [actualCash, setActualCash] = useState('');
  const [bankReconciled, setBankReconciled] = useState('');
  const [posReconciled, setPosReconciled] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const actual = Number(actualCash || 0);
  const expected = Number(shift.current_cash || 0);
  const difference = actualCash === '' ? null : actual - expected;
  const bankExpected = Number(shift.total_bank_inflow || 0);
  const posExpected = Number(shift.total_pos_inflow || 0);
  const bankDifference = bankReconciled === '' ? null : Number(bankReconciled) - bankExpected;
  const posDifference = posReconciled === '' ? null : Number(posReconciled) - posExpected;
  const deposited = actualCash === ''
    ? Number(shift.current_cash || 0) - Number(shift.opening_cash || 0)
    : actual - Number(shift.opening_cash || 0);
  const hasDifference = [difference, bankDifference, posDifference].some((value) => value !== null && Math.abs(value) > 0.009);
  const allReconciled = actualCash !== '' && bankReconciled !== '' && posReconciled !== '';

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/shifts/close', {
        shiftId: shift.id, actualCash: actual, reconciledBankInflow: Number(bankReconciled), reconciledPosInflow: Number(posReconciled),
        differenceReason: reason.trim() || undefined, notes: notes.trim() || undefined,
      });
      onDone();
    } catch (err) { setError(err.response?.data?.message || 'Không chốt được ca.'); }
    finally { setBusy(false); }
  }

  return (
    <form className="shift-inline-form" onSubmit={submit}>
      <div className="shift-form-heading"><div><p className="eyebrow">ĐỐI SOÁT THEO PHƯƠNG THỨC</p><h2>Chốt ca</h2></div><button className="btn btn-outline" type="button" onClick={onCancel} aria-label="Đóng">×</button></div>
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <div className="shift-closing-grid">
        <section className="shift-closing-method"><div><span>TIỀN MẶT · {shift.cash_order_count || 0} đơn</span><strong>{money(shift.total_cash_inflow)}</strong></div><div className="shift-closing-result"><span>Pay-in bổ sung quỹ</span><b>{money(shift.cash_replenishment_total)}</b></div><div className="form-group"><label htmlFor="actual-cash">Tiền mặt thực tế kiểm đếm</label><input id="actual-cash" className="form-control" type="number" min="0" step="0.01" value={actualCash} onChange={(e) => setActualCash(e.target.value)} required /></div><div className="shift-closing-result"><span>Quỹ lý thuyết</span><b>{money(expected)}</b></div><div className="shift-closing-result"><span>{deposited < 0 ? 'Cần bù két (thu mặt − tiền gốc)' : 'Nộp két (thu mặt − tiền gốc)'}</span><b>{money(deposited)}</b></div><strong className={difference === null ? '' : Math.abs(difference) < 0.009 ? 'shift-match' : 'shift-difference'}>{difference === null ? 'Chưa kiểm đếm' : Math.abs(difference) < 0.009 ? 'Khớp quỹ' : `${difference > 0 ? 'Thừa' : 'Thiếu'} ${money(Math.abs(difference))}`}</strong></section>
        <section className="shift-closing-method"><div><span>CHUYỂN KHOẢN · {shift.bank_transfer_order_count || 0} đơn</span><strong>{money(bankExpected)}</strong></div><div className="form-group"><label htmlFor="bank-reconciled">Số tiền đã đối soát sao kê</label><input id="bank-reconciled" className="form-control" type="number" min="0" step="0.01" value={bankReconciled} onChange={(e) => setBankReconciled(e.target.value)} required /></div><div className="shift-closing-result"><span>Chênh lệch chuyển khoản</span><b className={bankDifference === null ? '' : Math.abs(bankDifference) < 0.009 ? 'shift-match' : 'shift-difference'}>{bankDifference === null ? 'Chưa đối soát' : money(bankDifference)}</b></div></section>
        <section className="shift-closing-method"><div><span>ATM / POS · {shift.pos_order_count || 0} đơn</span><strong>{money(posExpected)}</strong></div><div className="form-group"><label htmlFor="pos-reconciled">Số tiền đã đối soát ATM/POS</label><input id="pos-reconciled" className="form-control" type="number" min="0" step="0.01" value={posReconciled} onChange={(e) => setPosReconciled(e.target.value)} required /></div><div className="shift-closing-result"><span>Chênh lệch ATM/POS</span><b className={posDifference === null ? '' : Math.abs(posDifference) < 0.009 ? 'shift-match' : 'shift-difference'}>{posDifference === null ? 'Chưa đối soát' : money(posDifference)}</b></div></section>
      </div>
      {hasDifference && <div className="form-group"><label htmlFor="difference-reason">Giải trình chênh lệch</label><textarea id="difference-reason" className="form-control" value={reason} onChange={(e) => setReason(e.target.value)} required /></div>}
      <div className="form-group"><label htmlFor="shift-close-notes">Ghi chú chốt ca <em>(không bắt buộc)</em></label><textarea id="shift-close-notes" className="form-control" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
      <div className="modal-actions"><button className="btn btn-outline" type="button" onClick={onCancel} disabled={busy}>Quay lại</button><button className="btn btn-primary" type="submit" disabled={busy || !allReconciled || (hasDifference && !reason.trim())}>{busy ? 'Đang khóa sổ...' : 'Hoàn tất chốt ca'}</button></div>
    </form>
  );
}

export default function ShiftManagementPage() {
  const { user } = useAuth();
  const [state, setState] = useState(null);
  const [shiftName, setShiftName] = useState('ca_1');
  const [openingCash, setOpeningCash] = useState('0');
  const [panel, setPanel] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [payables, setPayables] = useState([]);
  const [payableError, setPayableError] = useState('');
  const canOperate = roleCanOperate(user?.role);
  const canApprove = ['service_manager', 'admin'].includes(user?.role);
  const canManageCash = canApprove;

  const reload = useCallback(async () => {
    setError('');
    try {
      const response = await api.get('/shifts/current');
      setState(response.data.data);
      if (!response.data.data.current) setOpeningCash(String(response.data.data.settings?.default_opening_cash || 0));
      if (canApprove) {
        try {
          const payableResponse = await api.get('/shifts/inventory-payables');
          setPayables(payableResponse.data.data || []);
          setPayableError('');
        } catch (err) { setPayableError(err.response?.data?.message || 'Không tải được công nợ nhập kho.'); }
      } else {
        setPayables([]);
      }
    } catch (err) { setError(err.response?.data?.message || 'Không tải được ca làm việc hiện tại.'); }
    finally { setLoading(false); }
  }, [canApprove]);

  useEffect(() => {
    let active = true;
    async function loadCurrentShift() {
      setLoading(true);
      try {
        const response = await api.get('/shifts/current');
        if (!active) return;
        setState(response.data.data);
        if (!response.data.data.current) setOpeningCash(String(response.data.data.settings?.default_opening_cash || 0));
        if (canApprove) {
          try {
            const payableResponse = await api.get('/shifts/inventory-payables');
            if (active) setPayables(payableResponse.data.data || []);
          } catch (err) {
            if (active) setPayableError(err.response?.data?.message || 'Không tải được công nợ nhập kho.');
          }
        }
      } catch (err) {
        if (active) setError(err.response?.data?.message || 'Không tải được ca làm việc hiện tại.');
      } finally { if (active) setLoading(false); }
    }
    loadCurrentShift();
    return () => { active = false; };
  }, [canApprove]);

  async function openShift(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/shifts/open', { shiftName, openingCash: Number(openingCash) });
      setNotice('Đã mở ca làm việc.');
      await reload();
    } catch (err) { setError(err.response?.data?.message || 'Không mở được ca.'); }
    finally { setBusy(false); }
  }

  async function decide(transactionId, approved) {
    setBusy(true);
    setError('');
    try {
      await api.post(`/shifts/transactions/${transactionId}/decision`, { approved });
      setNotice(approved ? 'Đã phê duyệt phiếu chi.' : 'Đã từ chối phiếu chi.');
      await reload();
    } catch (err) { setError(err.response?.data?.message || 'Không cập nhật được phiếu chi.'); }
    finally { setBusy(false); }
  }

  async function settlePayable(payable, paymentSource = 'cash') {
    setBusy(true);
    setError('');
    try {
      await api.post(`/shifts/inventory-payables/${payable.id}/payout`, { paymentSource });
      setNotice(paymentSource === 'external' ? 'Admin đã tất toán công nợ nhập kho bằng nguồn ngoài.' : 'Đã payout công nợ nhập kho từ quỹ ca.');
      await reload();
    } catch (err) { setError(err.response?.data?.message || 'Không thanh toán được công nợ nhập kho.'); }
    finally { setBusy(false); }
  }

  if (loading) return <div className="shift-page"><p role="status">Đang tải sổ ca...</p></div>;
  const shift = state?.current;
  const pending = (shift?.transactions || []).filter((item) => item.approval_status === 'pending');

  return (
    <div className="shift-page">
      <div className="page-header"><div><p className="eyebrow">VẬN HÀNH & TÀI CHÍNH</p><h1>Quản lý ca & quỹ</h1><p>Theo dõi số đơn, tiền thu và đối soát riêng từng phương thức.</p></div>{user?.role !== 'receptionist' && <Link className="btn btn-outline" to="/cash-flow">Lịch sử & đối soát</Link>}</div>
      {notice && <div className="alert alert-success" role="status">{notice}</div>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {user?.role === 'admin' && <CashPolicyForm settings={state?.settings} onSaved={reload} />}

      {!shift && canOperate && (
        <section className="shift-open-section">
          <div className="shift-section-heading"><p className="eyebrow">BẮT ĐẦU VẬN HÀNH</p><h2>Mở ca làm việc</h2><p>Chỉ mở một ca tại một thời điểm. Ca đã chốt không thể chỉnh sửa.</p></div>
          <form className="shift-open-form" onSubmit={openShift}>
            <div className="shift-choice-group" role="radiogroup" aria-label="Chọn ca làm">
              {SHIFT_OPTIONS.map((option) => <label key={option.id} className={`shift-choice${shiftName === option.id ? ' is-selected' : ''}${state?.completedShifts?.includes(option.id) ? ' is-disabled' : ''}`}><input type="radio" name="shift-name" value={option.id} checked={shiftName === option.id} disabled={state?.completedShifts?.includes(option.id)} onChange={() => setShiftName(option.id)} /><strong>{option.label}</strong><span>{state?.completedShifts?.includes(option.id) ? 'Đã chốt hôm nay' : option.time}</span></label>)}
            </div>
            <div className="form-group"><label htmlFor="opening-cash">Tiền gốc mở ca (VNĐ)</label><input id="opening-cash" className="form-control" type="number" min="0" step="0.01" value={openingCash} onChange={(e) => setOpeningCash(e.target.value)} required /></div>
            <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Đang mở ca...' : 'Mở ca làm việc'}</button>
          </form>
        </section>
      )}

      {!shift && !canOperate && <div className="shift-empty"><h2>Chưa có ca đang mở</h2><p>Lễ tân hoặc quản trị viên cần mở ca trước khi bắt đầu thu chi.</p></div>}

      {shift && <>
        <section className="shift-current-heading"><div><p className="eyebrow">{shift.work_date && new Date(`${shift.work_date}T00:00:00`).toLocaleDateString('vi-VN')}</p><h2>{shift.shift_name === 'ca_1' ? 'Ca 1' : 'Ca 2'} <span>· Đang mở</span></h2><p>Mở lúc {new Date(shift.start_time).toLocaleString('vi-VN')} · Người mở ca: {shift.opened_by_name || `#${shift.opened_by}`}</p></div><div className="shift-header-actions">{canOperate && <>{user?.role === 'receptionist' && <button className="btn btn-outline" type="button" onClick={() => setPanel(panel === 'expense' ? '' : 'expense')}>+ Ghi phiếu chi</button>}<button className="btn btn-primary" type="button" onClick={() => setPanel(panel === 'close' ? '' : 'close')}>Đóng ca</button></>}{canManageCash && <><button className="btn btn-outline" type="button" onClick={() => setPanel(panel === 'payin' ? '' : 'payin')}>Pay-in</button><button className="btn btn-outline" type="button" onClick={() => setPanel(panel === 'payout' ? '' : 'payout')}>Payout</button></>}</div></section>
        <div className="shift-metrics">
          <Metric label="Tiền gốc ban đầu" value={shift.opening_cash} />
          <Metric label="Thu tiền mặt" value={shift.total_cash_inflow} note={`${shift.cash_order_count || 0} đơn`} />
          <Metric label="Pay-in vào quỹ" value={shift.cash_replenishment_total} />
          <Metric label="Chuyển khoản" value={shift.total_bank_inflow} note={`${shift.bank_transfer_order_count || 0} đơn`} />
          <Metric label="ATM / POS" value={shift.total_pos_inflow} note={`${shift.pos_order_count || 0} đơn`} />
          <Metric label="Chi tiền mặt đã duyệt" value={shift.total_cash_outflow} />
          <Metric label="Quỹ lý thuyết" value={shift.current_cash} note="Tiền gốc + tiền mặt thu − chi tiền mặt" />
        </div>

        {panel === 'expense' && user?.role === 'receptionist' && <TransactionForm shiftId={shift.id} approvalLimit={state?.settings?.expense_approval_limit} onCancel={() => setPanel('')} onDone={async () => { setPanel(''); setNotice('Đã ghi phiếu chi. Các khoản chi lớn đang chờ quản lý duyệt.'); await reload(); }} />}
        {panel === 'payin' && canManageCash && <ManagerCashForm type="inflow" availableCash={shift.payout_cash_available} onCancel={() => setPanel('')} onDone={async (message) => { setPanel(''); setNotice(message); await reload(); }} />}
        {panel === 'payout' && canManageCash && <ManagerCashForm type="outflow" availableCash={shift.payout_cash_available} onCancel={() => setPanel('')} onDone={async (message) => { setPanel(''); setNotice(message); await reload(); }} />}
        {panel === 'close' && canOperate && <CloseShiftForm shift={shift} onCancel={() => setPanel('')} onDone={async () => { setPanel(''); setNotice('Ca đã được chốt và khóa sổ.'); await reload(); }} />}

        {canApprove && pending.length > 0 && <section className="shift-pending-section"><div className="shift-section-heading"><p className="eyebrow">CẦN QUYẾT ĐỊNH</p><h2>Phiếu chi chờ duyệt</h2></div>{pending.map((item) => <article className="shift-pending-row" key={item.id}><div><strong>{item.description}</strong><span>{item.category} · {new Date(item.created_at).toLocaleString('vi-VN')}</span></div><b>{money(item.amount)}</b><div className="shift-row-actions"><button className="btn btn-primary" type="button" disabled={busy} onClick={() => decide(item.id, true)}>Duyệt</button><button className="btn btn-outline" type="button" disabled={busy} onClick={() => decide(item.id, false)}>Từ chối</button></div></article>)}</section>}

        <section className="shift-transactions-section"><div className="shift-section-heading"><p className="eyebrow">SỔ QUỸ CA HIỆN TẠI</p><h2>Giao dịch</h2></div><div className="table-wrapper"><table><thead><tr><th>Thời gian</th><th>Loại</th><th>Nội dung</th><th>Phương thức</th><th>Trạng thái</th><th>Số tiền</th>{canApprove && <th>Quyết định</th>}</tr></thead><tbody>{shift.transactions.map((item) => <tr key={item.id}><td>{new Date(item.created_at).toLocaleTimeString('vi-VN')}</td><td><span className={`cash-type ${item.transaction_type}`}>{item.transaction_type === 'inflow' ? 'Thu' : 'Chi'}</span></td><td>{item.description}</td><td>{item.payment_method === 'cash' ? 'Tiền mặt' : item.payment_method === 'bank_transfer' ? 'Chuyển khoản' : 'POS / thẻ'}</td><td>{item.approval_status === 'pending' ? 'Chờ duyệt' : item.approval_status === 'rejected' ? 'Từ chối' : 'Đã ghi sổ'}</td><td className={item.transaction_type === 'inflow' ? 'cash-positive' : 'cash-negative'}>{item.transaction_type === 'inflow' ? '+' : '−'}{money(item.amount)}</td>{canApprove && <td>{item.approval_status === 'pending' ? <div className="shift-row-actions"><button className="btn btn-primary" type="button" disabled={busy} onClick={() => decide(item.id, true)}>Duyệt</button><button className="btn btn-outline" type="button" disabled={busy} onClick={() => decide(item.id, false)}>Từ chối</button></div> : '—'}</td>}</tr>)}{!shift.transactions.length && <tr><td colSpan={canApprove ? 7 : 6} className="dashboard-empty-cell">Chưa có giao dịch trong ca.</td></tr>}</tbody></table></div></section>
      </>}
      {canApprove && <section className="shift-pending-section inventory-payables-section"><div className="shift-section-heading"><p className="eyebrow">CÔNG NỢ NHẬP KHO</p><h2>Khoản chờ payout</h2></div>{payableError && <div className="alert alert-error" role="alert">{payableError}</div>}{!payables.length && !payableError && <p className="shift-policy-note">Không có công nợ nhập kho đang mở.</p>}{payables.map((item) => {
        const availableCash = Number(shift?.payout_cash_available || 0);
        const canPayFromShift = Boolean(shift) && availableCash >= Number(item.remaining_amount);
        const canAdminResolve = user?.role === 'admin' && item.admin_resolve_eligible;
        return <article className="shift-pending-row" key={item.id}><div><strong>{item.part_name} · {item.part_code}</strong><span>Nhập {item.quantity} {item.unit} ngày {new Date(`${item.work_date}T00:00:00`).toLocaleDateString('vi-VN')} · Giá nhập {money(item.unit_cost)} / đơn vị</span></div><b>Còn nợ {money(item.remaining_amount)}</b><div className="shift-row-actions">{shift && <button className="btn btn-primary" type="button" disabled={busy || !canPayFromShift} title={!canPayFromShift ? `Quỹ còn ${money(availableCash)}` : 'Thanh toán từ tiền mặt ca'} onClick={() => settlePayable(item)}>Payout từ ca</button>}{canAdminResolve && <button className="btn btn-outline" type="button" disabled={busy} onClick={() => settlePayable(item, 'external')}>Admin xử lý</button>}{!shift && !canAdminResolve && <span>Chờ ca hoặc admin xử lý</span>}</div></article>;
      })}</section>}
    </div>
  );
}
