/**
 * DashboardPage — Trang tổng quan sau đăng nhập (staff roles).
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
  const waiting = jobs.filter((j) => j.status === 'pending').length;
  const inProgress = jobs.filter((j) => ['diagnosing', 'estimated', 'approved', 'in_repair'].includes(j.status)).length;
  const completed = jobs.filter((j) => j.status === 'completed').length;
  const canViewJobs = ['receptionist', 'service_manager', 'admin', 'mechanic'].includes(user?.role);
  const canViewStock = ['warehouse_staff', 'service_manager', 'admin'].includes(user?.role);
  const firstName = (user?.fullName || user?.email || '').trim().split(/\s+/).slice(-1)[0];
  const progressTotal = jobs.length || 1;

  return (
    <div className="dashboard-page">
      <div className="page-header dashboard-heading">
        <div>
          <p className="eyebrow">TỔNG QUAN XƯỞNG</p>
          <h1>Chào mừng trở lại{firstName ? ', ' + firstName : ''}</h1>
          <p>Cùng xem tình hình công việc và những việc cần ưu tiên hôm nay.</p>
        </div>
        {user?.role === 'receptionist' && <Link className="btn btn-primary" to="/reception">＋ Tiếp nhận xe</Link>}
      </div>
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <section className="dashboard-welcome">
        <div className="dashboard-welcome-copy">
          <span className="dashboard-welcome-kicker">GARAGE WORKSHOP</span>
          <h2>Mọi thứ đang vào guồng.</h2>
          <p>Theo dõi tiến độ sửa chữa, điều phối công việc và chuẩn bị vật tư tại một nơi.</p>
        </div>
        <div className="dashboard-welcome-mark" aria-hidden="true"><span>G</span></div>
      </section>

      <div className="dashboard-stats dashboard-stats-four">
        <article className="stat-card stat-card-forest">
          <span className="stat-icon" aria-hidden="true">▤</span>
          <span className="stat-label">Phiếu trong phạm vi</span>
          <strong className="stat-value">{canViewJobs ? jobs.length : '—'}</strong>
          <span className="stat-footnote">{canViewJobs ? active.length + ' phiếu đang hoạt động' : 'Không có quyền xem danh sách phiếu'}</span>
        </article>
        <article className="stat-card stat-card-sand">
          <span className="stat-icon" aria-hidden="true">◷</span>
          <span className="stat-label">Chờ tiếp nhận</span>
          <strong className="stat-value">{canViewJobs ? waiting : '—'}</strong>
          <span className="stat-footnote">Cần được xử lý tiếp theo</span>
        </article>
        <article className="stat-card stat-card-blue">
          <span className="stat-icon" aria-hidden="true">⚙</span>
          <span className="stat-label">Đang thực hiện</span>
          <strong className="stat-value">{canViewJobs ? inProgress : '—'}</strong>
          <span className="stat-footnote">Chẩn đoán, duyệt và sửa chữa</span>
        </article>
        <article className="stat-card stat-card-green">
          <span className="stat-icon" aria-hidden="true">✓</span>
          <span className="stat-label">{canViewStock ? 'Phụ tùng sắp hết' : 'Đã hoàn thành'}</span>
          <strong className="stat-value">{canViewStock ? lowStock.length : canViewJobs ? completed : '—'}</strong>
          <span className="stat-footnote">{canViewStock ? 'Cần kiểm tra tồn kho' : 'Phiếu đã kết thúc sửa chữa'}</span>
        </article>
      </div>

      <div className="dashboard-content-grid">
        <section className="card dashboard-table-card">
          <div className="card-heading dashboard-card-heading">
            <div>
              <p className="eyebrow">CẬP NHẬT MỚI NHẤT</p>
              <h2 className="dashboard-section-title">Phiếu sửa chữa gần đây</h2>
              <p className="dashboard-section-note">Theo dõi các xe đang được tiếp nhận tại xưởng.</p>
            </div>
            {['receptionist', 'service_manager', 'admin'].includes(user?.role) && (
              <Link className="text-link" to="/repair-jobs">Xem tất cả <span aria-hidden="true">→</span></Link>
            )}
          </div>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Phiếu / Phương tiện</th><th>Khách hàng</th><th>Trạng thái</th><th>Tiếp nhận</th></tr></thead>
              <tbody>
                {jobs.slice(0, 6).map((j) => (
                  <tr key={j.id}>
                    <td><strong>#{j.id}</strong><div className="table-secondary">{j.license_plate}{j.brand || j.model ? ' · ' + (j.brand || '') + ' ' + (j.model || '') : ''}</div></td>
                    <td>{j.customer_name || '—'}</td>
                    <td><StatusBadge status={j.status} /></td>
                    <td>{j.received_at ? new Date(j.received_at).toLocaleDateString('vi-VN') : '—'}</td>
                  </tr>
                ))}
                {!jobs.length && !error && <tr><td colSpan={4} className="dashboard-empty-cell">{canViewJobs ? 'Chưa có phiếu sửa chữa nào.' : 'Danh sách phiếu không nằm trong phạm vi công việc.'}</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="dashboard-side-stack">
          <section className="card dashboard-progress-card">
            <div className="dashboard-side-heading">
              <div><p className="eyebrow">TÌNH TRẠNG HIỆN TẠI</p><h2>Tiến độ xưởng</h2></div>
              <span className="dashboard-side-icon" aria-hidden="true">↗</span>
            </div>
            <div className="progress-summary"><strong>{canViewJobs ? completed + ' / ' + jobs.length : '—'}</strong><span>phiếu đã hoàn thành</span></div>
            <div className="dashboard-progress-track" role="progressbar" aria-label="Tỷ lệ phiếu đã hoàn thành" aria-valuemin="0" aria-valuemax="100" aria-valuenow={canViewJobs && jobs.length ? Math.round(completed / jobs.length * 100) : 0}>
              <span style={{ width: (canViewJobs ? Math.round(completed / progressTotal * 100) : 0) + '%' }} />
            </div>
            <div className="dashboard-status-list">
              <div><span><i className="status-dot dot-waiting" />Chờ tiếp nhận</span><strong>{canViewJobs ? waiting : '—'}</strong></div>
              <div><span><i className="status-dot dot-working" />Đang thực hiện</span><strong>{canViewJobs ? inProgress : '—'}</strong></div>
              <div><span><i className="status-dot dot-done" />Đã hoàn thành</span><strong>{canViewJobs ? completed : '—'}</strong></div>
            </div>
          </section>

          <section className="card dashboard-stock-card">
            <div className="dashboard-side-heading">
              <div><p className="eyebrow">KHO PHỤ TÙNG</p><h2>Cần chú ý</h2></div>
              <span className="stock-count">{canViewStock ? lowStock.length : '—'}</span>
            </div>
            {canViewStock && lowStock.length > 0 ? (
              <ul className="dashboard-stock-list">
                {lowStock.slice(0, 3).map((part) => (
                  <li key={part.id}>
                    <span className="dashboard-part-mark" aria-hidden="true">⌁</span>
                    <span><strong>{part.part_name || part.name || part.part_code || 'Phụ tùng'}</strong><small>{part.part_code || part.sku || 'Tồn kho thấp'}</small></span>
                    <b>{part.stock_quantity ?? part.quantity_in_stock ?? part.quantity ?? '—'}</b>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="dashboard-stock-note">{canViewStock ? 'Kho chưa có phụ tùng cần cảnh báo.' : 'Thông tin tồn kho chưa được tải cho vai trò này.'}</p>
            )}
            {canViewStock && <Link className="text-link dashboard-stock-link" to="/inventory">Mở kho phụ tùng <span aria-hidden="true">→</span></Link>}
          </section>
        </aside>
      </div>
    </div>
  );
}
