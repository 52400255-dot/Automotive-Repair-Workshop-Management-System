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

  useEffect(() => {
    api.get('/customers/me/vehicles')
      .then((r) => setVehicles(r.data.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    vehicles.forEach(async (v) => {
      try {
        const r = await api.get(`/vehicles/${v.id}/repair-history`);
        setHistories((h) => ({ ...h, [v.id]: r.data.data }));
      } catch { /* bỏ qua xe chưa có lịch sử */ }
    });
  }, [vehicles]);

  return (
    <div>
      <div className="page-header"><h1>Cổng theo dõi sửa chữa xe dành cho Khách hàng</h1></div>
      {!vehicles.length && <div className="card">Chưa có thông tin xe nào gắn với tài khoản của bạn. Vui lòng liên hệ gara để được hỗ trợ.</div>}

      <div style={{ display: 'grid', gap: 16 }}>
        {vehicles.map((v) => (
          <div key={v.id} className="card">
            <strong>{v.license_plate} — {v.brand} {v.model} ({v.manufacture_year})</strong>
            <div className="table-wrapper" style={{ marginTop: 8 }}>
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
