/**
 * StatusPortalPage — Cổng theo dõi cho Khách hàng (Customer Status Portal).
 * Xem lịch sử sửa chữa của xe và trạng thái phiếu đang xử lý.
 *
 * Demo: hiện theo lịch sử của tất cả xe thuộc khách hàng đăng nhập.
 * (US03 — View Vehicle Repair History)
 */
import { useEffect, useState } from 'react';
import api from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import Plate from '../../components/common/Plate';
import RepairOrderCode from '../../components/common/RepairOrderCode';
import WorkshopProgress from '../../components/common/WorkshopProgress';

export default function StatusPortalPage() {
  const [vehicles, setVehicles] = useState([]);
  const [histories, setHistories] = useState({});
  const [estimates, setEstimates] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [appointmentForm, setAppointmentForm] = useState({ vehicleId: '', requestedFor: '', customerRequest: '' });
  const [appointmentBusy, setAppointmentBusy] = useState(false);
  const [portalFeedback, setPortalFeedback] = useState(null);
  const [estimateBusyId, setEstimateBusyId] = useState(null);
  const [estimateFeedback, setEstimateFeedback] = useState(null);

  useEffect(() => {
    api.get('/customers/me/vehicles')
      .then((r) => setVehicles(r.data.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const [appointmentResult, invoiceResult, notificationResult] = await Promise.allSettled([
        api.get('/appointments/mine'), api.get('/invoices/my'), api.get('/notifications'),
      ]);
      if (!active) return;
      if (appointmentResult.status === 'fulfilled') setAppointments(appointmentResult.value.data.data || []);
      if (invoiceResult.status === 'fulfilled') setInvoices(invoiceResult.value.data.data || []);
      if (notificationResult.status === 'fulfilled') setNotifications(notificationResult.value.data.data || []);
      const failed = [appointmentResult, invoiceResult, notificationResult].find((result) => result.status === 'rejected');
      if (failed) setPortalFeedback({ type: 'error', text: failed.reason.response?.data?.message || 'Không tải đủ dữ liệu dịch vụ.' });
    };
    refresh();
    const timer = window.setInterval(refresh, 30000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    api.get('/estimates/my')
      .then((r) => setEstimates(r.data.data || []))
      .catch((err) => setEstimateFeedback({
        type: 'error',
        text: err.response?.data?.message || 'Không tải được báo giá.',
      }));
  }, []);

  async function decideEstimate(estimate, action) {
    if (action === 'reject' && !window.confirm(`Bạn có chắc muốn từ chối báo giá phiếu #${estimate.repair_job_id}? Phiếu sửa sẽ bị hủy.`)) return;
    setEstimateBusyId(estimate.id);
    setEstimateFeedback(null);
    try {
      const response = await api.put(`/estimates/${estimate.id}/${action}`);
      const nextStatus = response.data.data.status;
      setEstimates((current) => current.map((item) => item.id === estimate.id
        ? { ...item, status: nextStatus, repair_job_status: nextStatus === 'approved' ? 'approved' : 'cancelled' }
        : item));
      if (nextStatus === 'approved') {
        setHistories((current) => Object.fromEntries(Object.entries(current).map(([vehicleId, jobs]) => [
          vehicleId,
          jobs.map((job) => Number(job.id) === Number(estimate.repair_job_id) ? { ...job, status: 'approved' } : job),
        ])));
      }
      setEstimateFeedback({
        type: 'success',
        text: nextStatus === 'approved' ? 'Bạn đã đồng ý báo giá.' : 'Báo giá đã bị từ chối và phiếu sửa đã được hủy.',
      });
    } catch (err) {
      setEstimateFeedback({
        type: 'error',
        text: err.response?.data?.message || 'Không thể cập nhật quyết định báo giá.',
      });
    } finally {
      setEstimateBusyId(null);
    }
  }

  async function submitAppointment(event) {
    event.preventDefault();
    setAppointmentBusy(true);
    setPortalFeedback(null);
    try {
      const response = await api.post('/appointments', {
        vehicleId: Number(appointmentForm.vehicleId),
        requestedFor: new Date(appointmentForm.requestedFor).toISOString(),
        customerRequest: appointmentForm.customerRequest.trim(),
      });
      setAppointments((current) => [response.data.data, ...current]);
      setAppointmentForm({ vehicleId: '', requestedFor: '', customerRequest: '' });
      setPortalFeedback({ type: 'success', text: 'Đã gửi yêu cầu đặt lịch. Lịch chỉ chính thức sau khi gara xác nhận.' });
    } catch (err) { setPortalFeedback({ type: 'error', text: err.response?.data?.message || 'Không gửi được yêu cầu đặt lịch.' }); }
    finally { setAppointmentBusy(false); }
  }

  async function respondToAppointment(appointment, accept) {
    setAppointmentBusy(true);
    setPortalFeedback(null);
    try {
      const response = await api.post(`/appointments/${appointment.id}/customer-decision`, { accept });
      setAppointments((current) => current.map((item) => item.id === appointment.id ? { ...item, ...response.data.data } : item));
      setPortalFeedback({ type: 'success', text: accept ? 'Đã xác nhận giờ hẹn với gara.' : 'Đã từ chối giờ đề xuất. Bạn có thể gửi yêu cầu lịch mới.' });
    } catch (err) { setPortalFeedback({ type: 'error', text: err.response?.data?.message || 'Không cập nhật được lịch hẹn.' }); }
    finally { setAppointmentBusy(false); }
  }

  async function cancelAppointment(appointment) {
    setAppointmentBusy(true);
    setPortalFeedback(null);
    try {
      const response = await api.post(`/appointments/${appointment.id}/cancel`);
      setAppointments((current) => current.map((item) => item.id === appointment.id ? { ...item, ...response.data.data } : item));
      setPortalFeedback({ type: 'success', text: 'Đã hủy yêu cầu đặt lịch.' });
    } catch (err) { setPortalFeedback({ type: 'error', text: err.response?.data?.message || 'Không hủy được lịch hẹn.' }); }
    finally { setAppointmentBusy(false); }
  }

  async function markNotificationRead(notification) {
    if (notification.read_at) return;
    try {
      await api.post(`/notifications/${notification.id}/read`);
      setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item));
    } catch (err) { setPortalFeedback({ type: 'error', text: err.response?.data?.message || 'Không cập nhật được thông báo.' }); }
  }

  async function markAllNotificationsRead() {
    try {
      await api.post('/notifications/read-all');
      setNotifications((current) => current.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() })));
    } catch (err) { setPortalFeedback({ type: 'error', text: err.response?.data?.message || 'Không cập nhật được thông báo.' }); }
  }

  const money = (amount) => `${Number(amount || 0).toLocaleString('vi-VN')} ₫`;
  const appointmentLabel = { pending: 'Chờ gara xác nhận', proposed: 'Chờ bạn phản hồi giờ mới', confirmed: 'Đã xác nhận', declined: 'Không được xác nhận', cancelled: 'Đã hủy', converted: 'Đã tiếp nhận xe' };
  const hasActiveAppointmentForSelectedVehicle = appointments.some((appointment) =>
    String(appointment.vehicle_id) === String(appointmentForm.vehicleId)
    && ['pending', 'proposed', 'confirmed'].includes(appointment.status));

  useEffect(() => {
    vehicles.forEach(async (v) => {
      try {
        const r = await api.get(`/vehicles/${v.id}/repair-history`);
        setHistories((h) => ({ ...h, [v.id]: r.data.data }));
      } catch { /* bỏ qua xe chưa có lịch sử */ }
    });
  }, [vehicles]);

  return (
    <div className="status-portal-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Không gian khách hàng</p>
          <h1>Theo dõi sửa chữa</h1>
          <p>Tra cứu tình trạng xe, xem báo giá và xác nhận hạng mục sửa chữa.</p>
        </div>
      </div>

      {portalFeedback && <div className={`alert ${portalFeedback.type === 'error' ? 'alert-error' : 'alert-success'}`} role="status">{portalFeedback.text}</div>}

      <section className="portal-journey-grid">
        <article className="card portal-appointments-card">
          <div className="portal-section-heading"><div><p className="eyebrow">Đặt lịch tiếp nhận</p><h2>Hẹn gara</h2><p>Gửi yêu cầu trước; lễ tân sẽ xác nhận hoặc đề xuất giờ khác.</p></div></div>
          <form className="portal-appointment-form" onSubmit={submitAppointment}>
            <div className="form-group"><label htmlFor="appointment-vehicle">Xe</label><select id="appointment-vehicle" className="form-control" value={appointmentForm.vehicleId} onChange={(e) => setAppointmentForm({ ...appointmentForm, vehicleId: e.target.value })} required><option value="">-- Chọn xe --</option>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.license_plate} · {vehicle.brand} {vehicle.model}</option>)}</select></div>
            <div className="form-group"><label htmlFor="appointment-time">Thời gian mong muốn</label><input id="appointment-time" className="form-control" type="datetime-local" step="1800" value={appointmentForm.requestedFor} onChange={(e) => setAppointmentForm({ ...appointmentForm, requestedFor: e.target.value })} required /><small className="form-hint">Gara nhận lịch 07:00–21:30, mỗi 30 phút. Chỉ chọn giờ trong tương lai.</small></div>
            <div className="form-group portal-wide"><label htmlFor="appointment-request">Tình trạng / yêu cầu</label><textarea id="appointment-request" className="form-control" minLength="5" maxLength="1000" value={appointmentForm.customerRequest} onChange={(e) => setAppointmentForm({ ...appointmentForm, customerRequest: e.target.value })} placeholder="Ví dụ: xe rung khi phanh, muốn kiểm tra trong buổi sáng..." required /></div>
            {hasActiveAppointmentForSelectedVehicle && <p className="form-hint form-hint-warning portal-wide">Xe này đã có lịch đang chờ hoặc đã xác nhận.</p>}
            <button className="btn btn-primary portal-wide" type="submit" disabled={appointmentBusy || !vehicles.length || hasActiveAppointmentForSelectedVehicle}>{appointmentBusy ? 'Đang gửi...' : 'Gửi yêu cầu đặt lịch'}</button>
          </form>
          <div className="portal-appointment-list">{appointments.length ? appointments.map((appointment) => <article className="portal-appointment-row" key={appointment.id}><div><strong>{appointment.license_plate} · {appointment.brand} {appointment.model}</strong><span>{appointmentLabel[appointment.status] || appointment.status} · Mong muốn {new Date(appointment.requested_for).toLocaleString('vi-VN')}</span>{appointment.confirmed_for && <small>Giờ gara xác nhận: {new Date(appointment.confirmed_for).toLocaleString('vi-VN')}</small>}{appointment.staff_note && <small>Ghi chú gara: {appointment.staff_note}</small>}</div><div className="portal-appointment-actions">{appointment.status === 'proposed' && <><button className="btn btn-primary" type="button" disabled={appointmentBusy} onClick={() => respondToAppointment(appointment, true)}>Nhận giờ này</button><button className="btn btn-outline" type="button" disabled={appointmentBusy} onClick={() => respondToAppointment(appointment, false)}>Từ chối</button></>}{['pending','proposed','confirmed'].includes(appointment.status) && <button className="btn btn-outline" type="button" disabled={appointmentBusy} onClick={() => cancelAppointment(appointment)}>Hủy lịch</button>}</div></article>) : <p className="portal-empty-note">Chưa có yêu cầu đặt lịch.</p>}</div>
        </article>

        <article className="card portal-notifications-card">
          <div className="portal-section-heading"><div><p className="eyebrow">Cập nhật dịch vụ</p><h2>Thông báo</h2></div><button className="text-link" type="button" onClick={markAllNotificationsRead}>Đánh dấu đã đọc</button></div>
          <div className="portal-notification-list">{notifications.length ? notifications.map((notification) => <button className={`portal-notification${notification.read_at ? '' : ' is-unread'}`} type="button" key={notification.id} onClick={() => markNotificationRead(notification)}><span className="portal-notification-dot" /><span><strong>{notification.title}</strong><small>{notification.message}</small><em>{new Date(notification.created_at).toLocaleString('vi-VN')}</em></span></button>) : <p className="portal-empty-note">Chưa có cập nhật mới.</p>}</div>
        </article>
      </section>

      <section className="portal-estimate-section">
        <div className="portal-section-heading">
          <div>
            <p className="eyebrow">Xác nhận chi phí</p>
            <h2>Báo giá sửa chữa</h2>
          </div>
        </div>
        {estimateFeedback && (
          <div className={`alert ${estimateFeedback.type === 'error' ? 'alert-error' : 'alert-success'}`} role="status">
            {estimateFeedback.text}
          </div>
        )}
        {!estimates.length ? (
          <div className="card portal-estimate-empty">Chưa có báo giá nào cần hiển thị. Khi xưởng gửi báo giá, bạn có thể xác nhận tại đây.</div>
        ) : (
          <div className="portal-estimate-list">
            {estimates.map((estimate) => (
              <article key={estimate.id} className="card portal-estimate-card">
                <header className="portal-estimate-heading">
                  <div>
                    <p className="portal-vehicle-label">Phiếu <RepairOrderCode id={estimate.repair_job_id} /></p>
                    <h3><Plate value={estimate.license_plate} /> · {estimate.brand} {estimate.model}</h3>
                    <p>{estimate.customer_request}</p>
                  </div>
                  <span className={`badge ${estimate.status === 'rejected' ? 'badge-cancelled' : estimate.status === 'approved' ? 'badge-progress' : 'badge-approval'}`}>
                    {estimate.status === 'sent' ? 'Chờ bạn xác nhận' : estimate.status === 'approved' ? 'Đã đồng ý' : 'Đã từ chối'}
                  </span>
                </header>
                <div className="table-wrapper portal-estimate-table">
                  <table>
                    <thead><tr><th>Hạng mục</th><th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead>
                    <tbody>
                      {estimate.details.map((item) => (
                        <tr key={item.id}>
                          <td>{item.description}</td>
                          <td>{Number(item.quantity).toLocaleString('vi-VN')}</td>
                          <td>{money(item.unit_price)}</td>
                          <td>{money(Number(item.quantity) * Number(item.unit_price))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="portal-estimate-total">
                  <span>Tổng báo giá</span>
                  <strong>{money(estimate.total_amount)}</strong>
                </div>
                {estimate.status === 'sent' && (
                  <div className="portal-estimate-actions">
                    <button
                      type="button"
                      className="btn btn-danger"
                      disabled={estimateBusyId === estimate.id}
                      onClick={() => decideEstimate(estimate, 'reject')}
                    >Từ chối</button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={estimateBusyId === estimate.id}
                      onClick={() => decideEstimate(estimate, 'approve')}
                    >{estimateBusyId === estimate.id ? 'Đang xử lý...' : 'Đồng ý báo giá'}</button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="portal-invoices-section">
        <div className="portal-section-heading"><div><p className="eyebrow">Chứng từ thanh toán</p><h2>Hóa đơn & biên nhận</h2><p>Tra cứu chi tiết công, phụ tùng, trạng thái và phương thức thanh toán.</p></div></div>
        {invoices.length ? <div className="portal-invoice-list">{invoices.map((invoice) => <article className="card portal-invoice-card" key={invoice.id}><header><div><strong>Hóa đơn #{invoice.id}</strong><span><Plate value={invoice.license_plate} /> · {invoice.brand} {invoice.model}</span></div><StatusBadge status={invoice.status} /></header><div className="table-wrapper"><table><thead><tr><th>Hạng mục</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead><tbody>{invoice.details.map((item) => <tr key={item.id}><td>{item.description}</td><td>{Number(item.quantity).toLocaleString('vi-VN')}</td><td>{money(item.unit_price)}</td><td>{money(Number(item.quantity) * Number(item.unit_price))}</td></tr>)}</tbody></table></div><div className="portal-invoice-total"><span>Tổng hóa đơn</span><strong>{money(invoice.total_amount)}</strong></div>{invoice.payments?.length ? <div className="portal-payment-receipts"><p>Biên nhận</p>{invoice.payments.map((payment) => <span key={payment.id}>{payment.payment_method === 'cash' ? 'Tiền mặt' : payment.payment_method === 'bank_transfer' ? 'Chuyển khoản' : 'POS / thẻ'} · {money(payment.amount)} · {new Date(payment.paid_at).toLocaleString('vi-VN')}</span>)}</div> : <p className="portal-unpaid-note">Chưa thanh toán tại gara.</p>}</article>)}</div> : <div className="card portal-estimate-empty">Chưa có hóa đơn hoặc biên nhận nào.</div>}
      </section>

      {!vehicles.length && (
        <div className="card portal-empty-state">
          <span className="portal-empty-mark" aria-hidden="true">i</span>
          <div>
            <h2>Chưa có phương tiện</h2>
            <p>Chưa có thông tin xe nào gắn với tài khoản của bạn. Vui lòng liên hệ gara để được hỗ trợ.</p>
          </div>
        </div>
      )}

      <div className="portal-vehicle-list">
        {vehicles.map((v) => (
          <div key={v.id} className="card portal-vehicle-card">
            <div className="portal-vehicle-heading">
              <span className="portal-vehicle-mark" aria-hidden="true">{v.brand?.slice(0, 1) || 'V'}</span>
              <div>
                <span className="portal-vehicle-label">Phương tiện</span>
                <strong><Plate value={v.license_plate} /> <span>— {v.brand} {v.model} ({v.manufacture_year})</span></strong>
              </div>
            </div>
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Mã phiếu</th><th>Yêu cầu / Triệu chứng</th><th>Trạng thái</th><th>Tiếp nhận</th><th>Hoàn thành</th></tr></thead>
                <tbody>
                  {(histories[v.id] || []).map((j) => (
                    <tr key={j.id}>
                    <td><RepairOrderCode id={j.id} /></td>
                    <td className="job-request-cell"><span className="job-request-copy">{j.customer_request}</span></td>
                    <td className="portal-work-status"><StatusBadge status={j.status} /><WorkshopProgress status={j.status} compact /></td>
                      <td>{new Date(j.received_at).toLocaleString('vi-VN')}</td>
                      <td>{j.completed_at ? new Date(j.completed_at).toLocaleString('vi-VN') : '—'}</td>
                    </tr>
                  ))}
                  {!(histories[v.id] || []).length && <tr><td colSpan={5}>Xe này chưa có lịch sử sửa chữa</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
