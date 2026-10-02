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
    // Customer đăng nhập có user.id là id trong bảng users;
    // hồ sơ customers được API trả về theo khách hàng.
    api.get('/customers')
      .then((r) => {
        // Demo đơn giản: cho phép xem theo khách hàng đầu tiên khớp email
        const me = r.data.data.find((c) => c.email) || r.data.data[0];
        if (!me) return;
        return api.get(`/customers/${me.id}/vehicles`).then((vr) => setVehicles(vr.data.data));
      })
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
      <div className="page-header"><h1>Cua theo doi sua chua</h1></div>
      {!vehicles.length && <div className="card">Chua co thong tin xe. Vui long lien he gara.</div>}

      <div style={{ display: 'grid', gap: 16 }}>
        {vehicles.map((v) => (
          <div key={v.id} className="card">
            <strong>{v.license_plate} — {v.brand} {v.model} ({v.manufacture_year})</strong>
            <div className="table-wrapper" style={{ marginTop: 8 }}>
              <table>
                <thead><tr><th>Ma phieu</th><th>Yeu cau</th><th>Trang thai</th><th>Tiep nhan</th><th>Hoan thanh</th></tr></thead>
                <tbody>
                  {(histories[v.id] || []).map((j) => (
                    <tr key={j.id}>
                      <td>#{j.id}</td>
                      <td>{j.customer_request}</td>
                      <td><StatusBadge status={j.status} /></td>
                      <td>{new Date(j.received_at).toLocaleString('vi-VN')}</td>
                      <td>{j.completed_at ? new Date(j.completed_at).toLocaleString('vi-VN') : '—'}</td>
                    </tr>
                  ))}
                  {!(histories[v.id] || []).length && <tr><td colSpan={5}>Chua co lich su sua chua</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
