/**
 * DashboardPage — Trang tổng quan sau đăng nhập (staff roles).
 */
import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/common/StatusBadge';

export default function DashboardPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    // Chỉ gọi danh sách tất cả phiếu nếu có quyền
    if (['receptionist', 'service_manager', 'admin'].includes(user?.role)) {
      api.get('/repair-jobs').then((r) => setJobs(r.data.data)).catch((e) => setError(e.message));
    } else if (user?.role === 'mechanic') {
      api.get('/repair-jobs/my-jobs').then((r) => setJobs(r.data.data)).catch(() => {});
    }

    // Chỉ gọi cảnh báo kho nếu có quyền
    if (['warehouse_staff', 'service_manager', 'admin'].includes(user?.role)) {
      api.get('/spare-parts/low-stock').then((r) => setLowStock(r.data.data)).catch(() => {});
    }
  }, [user]);

  const active = jobs.filter((j) => !['completed', 'cancelled'].includes(j.status));

  return (
    <div>
      <div className="page-header"><h1>Bảng điều khiển</h1></div>
      {error && <p style={{ color: 'var(--error)' }}>{error}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card"><small style={{ color: '#757575' }}>Phiếu đang hoạt động</small><div style={{ fontSize: 28, fontWeight: 700 }}>{active.length}</div></div>
        <div className="card"><small style={{ color: '#757575' }}>Đã hoàn thành</small><div style={{ fontSize: 28, fontWeight: 700 }}>{jobs.filter((j) => j.status === 'completed').length}</div></div>
        <div className="card"><small style={{ color: '#757575' }}>Phụ tùng sắp hết</small><div style={{ fontSize: 28, fontWeight: 700, color: lowStock.length ? 'var(--warning)' : undefined }}>{lowStock.length}</div></div>
      </div>

      <div className="card">
        <h2 style={{ fontSize: 16, marginBottom: 12 }}>Phiếu sửa chữa gần đây</h2>
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Mã phiếu</th><th>Biển số xe</th><th>Khách hàng</th><th>Trạng thái</th><th>Thời gian tiếp nhận</th></tr></thead>
            <tbody>
              {jobs.slice(0, 8).map((j) => (
                <tr key={j.id}>
                  <td><strong>#{j.id}</strong></td><td>{j.license_plate}</td><td>{j.customer_name}</td>
                  <td><StatusBadge status={j.status} /></td>
                  <td>{new Date(j.received_at).toLocaleString('vi-VN')}</td>
                </tr>
              ))}
              {!jobs.length && !error && <tr><td colSpan={5}>Chưa có phiếu sửa chữa nào</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
