import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import Modal from '../../components/common/Modal';
import Plate from '../../components/common/Plate';
import RepairOrderCode from '../../components/common/RepairOrderCode';

const METHODS = [
  { id: 'cash', label: 'Tiền mặt' },
  { id: 'bank_transfer', label: 'Chuyển khoản' },
  { id: 'card', label: 'POS / ví chạm' },
];
const money = (value) => `${Number(value || 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} đ`;

function makeQrUrl(invoice, job, config) {
  if (!config.bankId || !config.accountNo || !config.accountName) return '';
  const info = `TT HD${invoice.id} ${job.license_plate || ''}`.trim().replace(/\s+/g, ' ');
  const amount = Math.round(Number(invoice.total_amount));
  if (!Number.isSafeInteger(amount) || amount <= 0) return '';
  const query = new URLSearchParams({
    acc: config.accountNo,
    bank: config.bankId,
    amount: String(amount),
    des: info,
    template: config.template || 'compact',
    showinfo: 'true',
    fullacc: 'true',
    holder: config.accountName,
    store: config.store || '',
  });
  return `https://vietqr.app/img?${query}`;
}

export default function PaymentCheckoutModal({ job, onClose, onSuccess }) {
  const bank = {
    bankId: import.meta.env.VITE_BANK_ID || '',
    accountNo: import.meta.env.VITE_BANK_ACCOUNT_NO || '',
    accountName: import.meta.env.VITE_BANK_ACCOUNT_NAME || '',
    bankName: import.meta.env.VITE_BANK_NAME || '',
    store: import.meta.env.VITE_BANK_STORE || '',
    template: import.meta.env.VITE_BANK_QR_TEMPLATE || 'compact',
  };
  const [invoice, setInvoice] = useState(null);
  const [shift, setShift] = useState(null);
  const [method, setMethod] = useState('cash');
  const [amountGiven, setAmountGiven] = useState('');
  const [traceCode, setTraceCode] = useState('');
  const [confirmedReceipt, setConfirmedReceipt] = useState(false);
  const [qrImageError, setQrImageError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function prepareCheckout() {
      setLoading(true);
      setError('');
      try {
        const shiftResponse = await api.get('/shifts/current');
        if (!active) return;
        const currentShift = shiftResponse.data.data.current;
        setShift(currentShift);
        if (!currentShift) return;
        const invoiceResponse = await api.get(`/invoices/by-job/${job.id}`).catch(async (lookupError) => {
          if (lookupError.response?.status !== 404) throw lookupError;
          return api.post('/invoices', { repairJobId: job.id });
        });
        if (!active) return;
        setInvoice(invoiceResponse.data.data);
        setAmountGiven(String(invoiceResponse.data.data.total_amount || ''));
      } catch (loadError) {
        if (active) setError(loadError.response?.data?.message || 'Không chuẩn bị được hóa đơn thanh toán.');
      } finally { if (active) setLoading(false); }
    }
    prepareCheckout();
    return () => { active = false; };
  }, [job.id]);

  const total = Number(invoice?.total_amount || 0);
  const given = Number(amountGiven || 0);
  const change = Math.round((given - total) * 100) / 100;
  const qrUrl = invoice ? makeQrUrl(invoice, job, bank) : '';
  const alreadyPaid = invoice?.status === 'paid';
  const canConfirm = Boolean(invoice && invoice.status === 'issued' && shift && !alreadyPaid && !loading && !submitting
    && (method !== 'cash' || (Number.isFinite(given) && given >= total))
    && (method !== 'bank_transfer' || (Boolean(qrUrl) && confirmedReceipt))
    && (method !== 'card' || confirmedReceipt));

  async function confirmPayment() {
    if (!canConfirm) return;
    setSubmitting(true);
    setError('');
    try {
      const response = await api.put(`/invoices/${invoice.id}/pay`, {
        amount: total,
        paymentMethod: method,
        ...(method === 'card' && traceCode.trim() ? { traceCode: traceCode.trim() } : {}),
      });
      onSuccess(`Đã thu ${money(total)} cho hóa đơn #${invoice.id} bằng ${METHODS.find((item) => item.id === method)?.label.toLowerCase()}.`);
      return response.data.data;
    } catch (paymentError) {
      setError(paymentError.response?.data?.message || 'Không xác nhận được khoản thanh toán.');
      if (paymentError.response?.status === 409) {
        try {
          const latest = await api.get(`/invoices/by-job/${job.id}`);
          setInvoice(latest.data.data);
        } catch { /* Keep the payment error visible when refreshing fails. */ }
      }
    } finally { setSubmitting(false); }
  }

  return (
    <Modal onClose={() => { if (!submitting) onClose(); }} labelledBy="payment-checkout-title" className="payment-checkout-modal">
      <div className="modal-header">
        <div><p className="eyebrow">THU TIỀN & XUẤT HÓA ĐƠN</p><h2 id="payment-checkout-title">Thanh toán phiếu <RepairOrderCode id={job.id} /></h2></div>
        <button type="button" className="btn btn-outline modal-close" onClick={onClose} disabled={submitting} aria-label="Đóng">×</button>
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {loading && <p role="status">Đang kiểm tra ca và chuẩn bị hóa đơn...</p>}
      {!loading && !shift && <div className="alert alert-error" role="alert">Chưa có ca làm việc đang mở. Chưa ghi nhận thanh toán. <Link to="/shifts" onClick={onClose}>Mở sổ ca</Link> rồi quay lại phiếu này.</div>}
      {alreadyPaid && <div className="alert alert-success" role="status">Hóa đơn này đã được thanh toán {invoice.payments?.[0] ? `bằng ${invoice.payments[0].payment_method === 'cash' ? 'tiền mặt' : invoice.payments[0].payment_method === 'bank_transfer' ? 'chuyển khoản' : 'POS / thẻ'}` : ''}. Không thể thu lại lần nữa.</div>}
      {invoice && !['issued', 'paid'].includes(invoice.status) && <div className="alert alert-error" role="alert">Hóa đơn đang ở trạng thái “{invoice.status}”, chưa thể thu tiền. Hãy liên hệ quản lý để kiểm tra.</div>}

      {invoice && <>
        <div className="payment-checkout-summary">
          <div><span>Khách hàng</span><strong>{job.customer_name || '—'}</strong></div>
          <div><span>Phương tiện</span><strong><Plate value={job.license_plate} /> · {job.brand} {job.model}</strong></div>
          <div><span>Hóa đơn</span><strong>#{invoice.id}</strong></div>
          <div className="payment-total"><span>Tổng cần thu</span><strong>{money(total)}</strong></div>
        </div>

        {!alreadyPaid && shift && <>
          <div className="payment-method-tabs" role="tablist" aria-label="Phương thức thanh toán">
            {METHODS.map((item) => <button key={item.id} type="button" role="tab" aria-selected={method === item.id} className={method === item.id ? 'is-active' : ''} onClick={() => { setMethod(item.id); setConfirmedReceipt(false); setError(''); }}>{item.label}</button>)}
          </div>

          {method === 'cash' && <section className="payment-method-panel">
            <div className="form-group"><label htmlFor="payment-amount-given">Tiền khách đưa</label><input id="payment-amount-given" className="form-control" type="number" min={total} step="1" value={amountGiven} onChange={(e) => setAmountGiven(e.target.value)} autoFocus /></div>
            <div className="cash-quick-amounts"><button className="btn btn-outline" type="button" onClick={() => setAmountGiven(String(total))}>Đưa đủ</button>{[50000, 100000, 200000, 500000].map((extra) => <button key={extra} className="btn btn-outline" type="button" onClick={() => setAmountGiven(String(total + extra))}>+{money(extra)}</button>)}</div>
            <div className={`cash-change-result ${change >= 0 ? 'is-change' : 'is-short'}`} aria-live="polite">{change >= 0 ? `Tiền thối lại khách: ${money(change)}` : `Khách đưa thiếu ${money(Math.abs(change))}`}</div>
          </section>}

          {method === 'bank_transfer' && <section className="payment-method-panel">
            {qrUrl ? <div className="payment-bank-layout">{qrImageError ? <div className="alert alert-error">Không tải được ảnh QR. Có thể dùng thông tin tài khoản bên cạnh để chuyển khoản thủ công.</div> : <img className="payment-qr-image" src={qrUrl} alt={`Mã QR thanh toán hóa đơn ${invoice.id}`} onError={() => setQrImageError(true)} />}<div className="payment-bank-details"><p>Nhờ khách quét mã QR và nhân viên xác nhận sau khi thấy tiền vào tài khoản.</p><dl><dt>Ngân hàng</dt><dd>{bank.bankName || bank.bankId}</dd><dt>Chủ tài khoản</dt><dd>{bank.accountName}</dd><dt>Số tài khoản</dt><dd>{bank.accountNo}</dd><dt>Số tiền</dt><dd>{money(total)}</dd><dt>Nội dung</dt><dd>TT HD{invoice.id} {job.license_plate}</dd></dl><label className="payment-confirm-check"><input type="checkbox" checked={confirmedReceipt} onChange={(e) => setConfirmedReceipt(e.target.checked)} /> Tôi đã kiểm tra tài khoản và xác nhận đã nhận đủ tiền.</label></div></div> : <div className="alert alert-error">Chưa cấu hình tài khoản ngân hàng của gara. Mã QR chưa thể tạo. Hãy cấu hình VITE_BANK_ID, VITE_BANK_ACCOUNT_NO và VITE_BANK_ACCOUNT_NAME trong frontend/.env.</div>}
          </section>}

          {method === 'card' && <section className="payment-method-panel"><div className="payment-pos-instruction"><p>Thực hiện thanh toán trên máy POS hoặc thiết bị ví chạm với số tiền:</p><strong>{money(total)}</strong><p>Sau khi máy báo giao dịch thành công, xác nhận tại đây.</p></div><div className="form-group"><label htmlFor="payment-trace-code">Mã tham chiếu POS <em>(không bắt buộc)</em></label><input id="payment-trace-code" className="form-control" maxLength="100" value={traceCode} onChange={(e) => setTraceCode(e.target.value)} placeholder="Trace / mã giao dịch" /><small className="form-hint">Mã trace được lưu trong diễn giải giao dịch để đối soát.</small></div><label className="payment-confirm-check"><input type="checkbox" checked={confirmedReceipt} onChange={(e) => setConfirmedReceipt(e.target.checked)} /> Máy POS xác nhận giao dịch thành công.</label></section>}
        </>}

        <div className="modal-actions"><button type="button" className="btn btn-outline" onClick={onClose} disabled={submitting}>Đóng</button>{!alreadyPaid && shift && <button type="button" className="btn btn-primary" onClick={confirmPayment} disabled={!canConfirm}>{submitting ? 'Đang xác nhận...' : method === 'cash' ? 'Xác nhận thu tiền mặt' : method === 'bank_transfer' ? 'Xác nhận đã nhận chuyển khoản' : 'Xác nhận POS thành công'}</button>}</div>
      </>}
    </Modal>
  );
}
