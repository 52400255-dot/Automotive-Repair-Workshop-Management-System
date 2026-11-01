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

export default function StatusPortalPage() {
  const [vehicles, setVehicles] = useState([]);
  const [histories, setHistories] = useState({});
  const [estimates, setEstimates] = useState([]);
  const [estimateBusyId, setEstimateBusyId] = useState(null);
  const [estimateFeedback, setEstimateFeedback] = useState(null);

  useEffect(() => {
    api.get('/customers/me/vehicles')
      .then((r) => setVehicles(r.data.data || []))
      .catch(() => {});
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

  const money = (amount) => `${Number(amount || 0).toLocaleString('vi-VN')} ₫`;

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
                    <p className="portal-vehicle-label">Phiếu #{estimate.repair_job_id}</p>
                    <h3>{estimate.license_plate} · {estimate.brand} {estimate.model}</h3>
                    <p>{estimate.customer_request}</p>
                  </div>
                  <span className={`badge ${estimate.status === 'rejected' ? 'badge-cancelled' : estimate.status === 'approved' ? 'badge-completed' : 'badge-pending'}`}>
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
                      className="btn btn-outline"
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
                <strong>{v.license_plate} — {v.brand} {v.model} ({v.manufacture_year})</strong>
              </div>
            </div>
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Mã phiếu</th><th>Yêu cầu / Triệu chứng</th><th>Trạng thái</th><th>Tiếp nhận</th><th>Hoàn thành</th></tr></thead>
                <tbody>
                  {(histories[v.id] || []).map((j) => (
                    <tr key={j.id}>
                      <td><strong>#{j.id}</strong></td>
                      <td>{j.customer_request}</td>
                      <td><StatusBadge status={j.status} /></td>
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
