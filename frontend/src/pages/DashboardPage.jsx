import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/common/StatusBadge';
import Plate from '../components/common/Plate';
import RepairOrderCode from '../components/common/RepairOrderCode';

const ROLE_INFO = {
  receptionist: { title: 'Tổng quan tiếp nhận', description: 'Theo dõi xe mới vào xưởng, lịch hẹn, báo giá và các lượt bàn giao.', actions: [['Tiếp nhận xe', '/reception'], ['Lịch hẹn', '/appointments'], ['Phiếu sửa chữa', '/repair-jobs'], ['Quản lý ca & quỹ', '/shifts']] },
  service_manager: { title: 'Tổng quan điều hành', description: 'Nắm tiến độ sửa chữa và các điểm cần điều phối trong xưởng.', actions: [['Điều phối phiếu', '/repair-jobs'], ['Kiểm tra kho', '/inventory'], ['Duyệt ca & quỹ', '/shifts'], ['Đối soát dòng tiền', '/cash-flow']] },
  mechanic: { title: 'Tổng quan công việc', description: 'Các phiếu đang giao cho bạn và tiến độ xử lý trong ngày.', actions: [['Mở bảng công việc', '/task-board']] },
  warehouse_staff: { title: 'Tổng quan kho phụ tùng', description: 'Theo dõi mức tồn và các mặt hàng cần bổ sung.', actions: [['Mở kho phụ tùng', '/inventory']] },
  admin: { title: 'Tổng quan hệ thống', description: 'Tình hình vận hành xưởng, tồn kho và tài khoản hệ thống.', actions: [['Quản lý phiếu', '/repair-jobs'], ['Quản lý vai trò', '/admin/roles'], ['Quản lý ca & quỹ', '/shifts'], ['Đối soát dòng tiền', '/cash-flow']] },
  customer: { title: 'Tổng quan dịch vụ', description: 'Theo dõi xe, tiến độ sửa chữa và báo giá từ xưởng.', actions: [['Theo dõi sửa chữa', '/portal'], ['Cập nhật tài khoản', '/profile']] },
};

const ACTIVE_STATUSES = ['pending', 'diagnosing', 'estimated', 'approved', 'in_repair'];
const STATUS_LABELS = {
  pending: 'Chờ tiếp nhận', diagnosing: 'Đang chẩn đoán', estimated: 'Chờ duyệt báo giá',
  approved: 'Đã duyệt', in_repair: 'Đang sửa chữa', completed: 'Đã hoàn thành', cancelled: 'Đã hủy',
};
const greetingName = (user) => (user?.fullName || user?.email || '').trim().split(/\s+/).slice(-1)[0];

function MetricStrip({ items }) {
  return (
    <div className="role-dashboard-metrics">
      {items.map((item) => (
        <article className="role-dashboard-metric" key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          <small>{item.note}</small>
        </article>
      ))}
    </div>
  );
}

function QuickActions({ items }) {
  return (
    <nav className="role-dashboard-actions" aria-label="Thao tác nhanh">
      {items.map(([label, to]) => <Link className="role-dashboard-action" key={to} to={to}>{label}<span aria-hidden="true">↗</span></Link>)}
    </nav>
  );
}

function JobTable({ jobs, emptyText }) {
  return (
    <div className="table-wrapper role-dashboard-table">
      <table>
        <thead><tr><th>Phiếu</th><th>Xe</th><th>Khách hàng</th><th>Trạng thái</th><th>Tiếp nhận</th></tr></thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id}>
              <td><RepairOrderCode id={job.id} /></td>
              <td><Plate value={job.license_plate} /><div className="table-secondary">{[job.brand, job.model].filter(Boolean).join(' ')}</div></td>
              <td>{job.customer_name || '—'}</td>
              <td><StatusBadge status={job.status} /></td>
              <td>{job.received_at ? new Date(job.received_at).toLocaleDateString('vi-VN') : '—'}</td>
            </tr>
          ))}
          {!jobs.length && <tr><td colSpan={5} className="dashboard-empty-cell">{emptyText}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function SectionHeading({ kicker, title, to, linkLabel }) {
  return (
    <div className="role-dashboard-section-heading">
      <div><p className="eyebrow">{kicker}</p><h2>{title}</h2></div>
      {to && <Link className="text-link" to={to}>{linkLabel || 'Xem tất cả'} <span aria-hidden="true">→</span></Link>}
    </div>
  );
}

function JobDistribution({ jobs }) {
  const counts = Object.keys(STATUS_LABELS).map((status) => ({ status, count: jobs.filter((job) => job.status === status).length }));
  return (
    <div className="role-dashboard-breakdown">
      {counts.filter(({ count }) => count > 0).map(({ status, count }) => (
        <div key={status}><span>{STATUS_LABELS[status]}</span><strong>{count}</strong><i><b style={{ width: `${Math.max(8, count / Math.max(jobs.length, 1) * 100)}%` }} /></i></div>
      ))}
      {!jobs.length && <p>Chưa có phiếu sửa chữa để thống kê.</p>}
    </div>
  );
}

function StockList({ parts, emptyText = 'Hiện không có phụ tùng cần chú ý.' }) {
  return !parts.length ? <p className="role-dashboard-empty">{emptyText}</p> : (
    <ul className="role-dashboard-stock-list">
      {parts.slice(0, 6).map((part) => (
        <li key={part.id}><span><strong>{part.part_name}</strong><small>{part.part_code} · Tối thiểu {part.min_stock}</small></span><b>{part.stock_quantity} {part.unit}</b></li>
      ))}
    </ul>
  );
}

function CustomerHistory({ vehicles, histories }) {
  const rows = vehicles.flatMap((vehicle) => (histories[vehicle.id] || []).map((job) => ({ ...job, vehicle })))
    .sort((a, b) => new Date(b.received_at) - new Date(a.received_at)).slice(0, 5);
  return !rows.length ? <p className="role-dashboard-empty">Chưa có lịch sử sửa chữa cho các xe đã liên kết.</p> : (
    <div className="table-wrapper role-dashboard-table">
      <table>
        <thead><tr><th>Phiếu</th><th>Phương tiện</th><th>Yêu cầu</th><th>Trạng thái</th><th>Ngày nhận</th></tr></thead>
        <tbody>{rows.map((job) => (
          <tr key={`${job.vehicle.id}-${job.id}`}>
            <td><RepairOrderCode id={job.id} /></td>
            <td><Plate value={job.vehicle.license_plate} /><div className="table-secondary">{job.vehicle.brand} {job.vehicle.model}</div></td>
            <td>{job.customer_request}</td><td><StatusBadge status={job.status} /></td>
            <td>{job.received_at ? new Date(job.received_at).toLocaleDateString('vi-VN') : '—'}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const role = user?.role;
  const info = ROLE_INFO[role] || ROLE_INFO.admin;
  const [data, setData] = useState({ jobs: [], parts: [], users: [], vehicles: [], histories: {}, estimates: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function loadDashboard() {
      setLoading(true);
      setError('');
      try {
        let next = { jobs: [], parts: [], users: [], vehicles: [], histories: {}, estimates: [] };
        if (role === 'receptionist') {
          const response = await api.get('/repair-jobs');
          next.jobs = response.data.data || [];
        } else if (role === 'service_manager') {
          const [jobs, parts] = await Promise.all([api.get('/repair-jobs'), api.get('/spare-parts/low-stock')]);
          next.jobs = jobs.data.data || [];
          next.parts = parts.data.data || [];
        } else if (role === 'mechanic') {
          const response = await api.get('/repair-jobs/my-jobs');
          next.jobs = response.data.data || [];
        } else if (role === 'warehouse_staff') {
          const [parts, lowStock] = await Promise.all([api.get('/spare-parts'), api.get('/spare-parts/low-stock')]);
          next.allParts = parts.data.data || [];
          next.parts = lowStock.data.data || [];
        } else if (role === 'admin') {
          const [jobs, parts, users] = await Promise.all([api.get('/repair-jobs'), api.get('/spare-parts/low-stock'), api.get('/users')]);
          next.jobs = jobs.data.data || [];
          next.parts = parts.data.data || [];
          next.users = users.data.data || [];
        } else if (role === 'customer') {
          const [vehicles, estimates] = await Promise.all([api.get('/customers/me/vehicles'), api.get('/estimates/my')]);
          next.vehicles = vehicles.data.data || [];
          next.estimates = estimates.data.data || [];
          const histories = await Promise.all(next.vehicles.map(async (vehicle) => {
            try {
              const result = await api.get(`/vehicles/${vehicle.id}/repair-history`);
              return [vehicle.id, result.data.data || []];
            } catch { return [vehicle.id, []]; }
          }));
          next.histories = Object.fromEntries(histories);
        }
        if (active) setData(next);
      } catch (loadError) {
        if (active) setError(loadError.response?.data?.message || 'Không tải được dữ liệu tổng quan.');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadDashboard();
    return () => { active = false; };
  }, [role]);

  const allCustomerJobs = useMemo(() => Object.values(data.histories).flat(), [data.histories]);
  const activeJobs = data.jobs.filter((job) => ACTIVE_STATUSES.includes(job.status));
  const pendingEstimates = data.estimates.filter((estimate) => estimate.status === 'sent');
  const lowStock = data.parts.filter((part) => Number(part.stock_quantity) > 0);
  const outOfStock = data.parts.filter((part) => Number(part.stock_quantity) <= 0);

  let metrics;
  let mainSection;
  let sideSection;
  if (role === 'receptionist') {
    metrics = [
      { label: 'Phiếu đang hoạt động', value: activeJobs.length, note: 'Đang trong quy trình' },
      { label: 'Chờ tiếp nhận', value: data.jobs.filter((job) => job.status === 'pending').length, note: 'Cần phân công xử lý' },
      { label: 'Chờ duyệt báo giá', value: data.jobs.filter((job) => job.status === 'estimated').length, note: 'Đang chờ khách hàng' },
      { label: 'Sẵn sàng bàn giao', value: data.jobs.filter((job) => job.status === 'completed').length, note: 'Đã hoàn tất sửa chữa' },
    ];
    mainSection = <><SectionHeading kicker="Ưu tiên xử lý" title="Phiếu cần theo dõi" to="/repair-jobs" /><JobTable jobs={data.jobs.filter((job) => ACTIVE_STATUSES.includes(job.status)).slice(0, 6)} emptyText="Không có phiếu nào đang chờ xử lý." /></>;
    sideSection = <><SectionHeading kicker="Nhịp vận hành" title="Phân bố trạng thái" /><JobDistribution jobs={data.jobs} /></>;
  } else if (role === 'service_manager') {
    metrics = [
      { label: 'Phiếu đang hoạt động', value: activeJobs.length, note: `Trên tổng ${data.jobs.length} phiếu` },
      { label: 'Chờ xử lý', value: data.jobs.filter((job) => ['pending', 'estimated'].includes(job.status)).length, note: 'Tiếp nhận hoặc chờ duyệt' },
      { label: 'Đang sửa chữa', value: data.jobs.filter((job) => job.status === 'in_repair').length, note: 'Đang ở khu vực kỹ thuật' },
      { label: 'Cảnh báo tồn kho', value: data.parts.length, note: 'Cần kiểm tra bổ sung' },
    ];
    mainSection = <><SectionHeading kicker="Điều phối xưởng" title="Phiếu đang hoạt động" to="/repair-jobs" /><JobTable jobs={activeJobs.slice(0, 6)} emptyText="Xưởng hiện không có phiếu đang hoạt động." /></>;
    sideSection = <><SectionHeading kicker="Cần bổ sung" title="Phụ tùng tồn thấp" to="/inventory" linkLabel="Mở kho" /><StockList parts={data.parts} /></>;
  } else if (role === 'mechanic') {
    metrics = [
      { label: 'Phiếu được giao', value: data.jobs.length, note: 'Trong phạm vi của bạn' },
      { label: 'Chờ chẩn đoán', value: data.jobs.filter((job) => job.status === 'pending' || job.status === 'diagnosing').length, note: 'Cần kiểm tra kỹ thuật' },
      { label: 'Đang sửa chữa', value: data.jobs.filter((job) => job.status === 'in_repair').length, note: 'Cập nhật tiến độ sau thao tác' },
      { label: 'Đã hoàn tất', value: data.jobs.filter((job) => job.status === 'completed').length, note: 'Phiếu đã đóng' },
    ];
    mainSection = <><SectionHeading kicker="Công việc của tôi" title="Phiếu được giao gần đây" to="/task-board" linkLabel="Mở bảng việc" /><JobTable jobs={data.jobs.slice(0, 6)} emptyText="Chưa có phiếu nào được phân công cho bạn." /></>;
    sideSection = <><SectionHeading kicker="Phân bổ công việc" title="Tiến độ của tôi" /><JobDistribution jobs={data.jobs} /></>;
  } else if (role === 'warehouse_staff') {
    metrics = [
      { label: 'Mã phụ tùng', value: data.allParts?.length || 0, note: 'Đang quản lý trong kho' },
      { label: 'Tồn thấp', value: lowStock.length, note: 'Bằng hoặc dưới định mức' },
      { label: 'Hết hàng', value: outOfStock.length, note: 'Cần lên kế hoạch nhập' },
      { label: 'Tổng lượng tồn', value: (data.allParts || []).reduce((sum, part) => sum + Number(part.stock_quantity || 0), 0).toLocaleString('vi-VN'), note: 'Cộng tất cả mã phụ tùng' },
    ];
    mainSection = <><SectionHeading kicker="Cần theo dõi" title="Mặt hàng tồn thấp" to="/inventory" /><StockList parts={data.parts} emptyText="Không có mặt hàng nào dưới định mức." /></>;
    sideSection = <><SectionHeading kicker="Trong kho" title="Tình trạng tồn" /><div className="role-dashboard-breakdown"><div><span>Còn trên định mức</span><strong>{(data.allParts || []).filter((part) => Number(part.stock_quantity) > Number(part.min_stock)).length}</strong></div><div><span>Tồn thấp hoặc hết hàng</span><strong>{data.parts.length}</strong></div><div><span>Đã hết tồn</span><strong>{outOfStock.length}</strong></div></div><div className="role-dashboard-note">{outOfStock.length ? `${outOfStock.length} mặt hàng đã hết tồn.` : 'Chưa có mặt hàng nào hết tồn.'}</div></>;
  } else if (role === 'admin') {
    metrics = [
      { label: 'Tài khoản', value: data.users.length, note: 'Tất cả vai trò' },
      { label: 'Phiếu đang hoạt động', value: activeJobs.length, note: 'Đang xử lý trong xưởng' },
      { label: 'Chờ xử lý', value: data.jobs.filter((job) => ['pending', 'estimated'].includes(job.status)).length, note: 'Tiếp nhận hoặc duyệt báo giá' },
      { label: 'Cảnh báo tồn kho', value: data.parts.length, note: 'Phụ tùng bằng hoặc dưới định mức' },
    ];
    mainSection = <><SectionHeading kicker="Hoạt động xưởng" title="Phiếu sửa chữa gần đây" to="/repair-jobs" /><JobTable jobs={data.jobs.slice(0, 6)} emptyText="Chưa có phiếu sửa chữa." /></>;
    sideSection = <><SectionHeading kicker="Cảnh báo kho" title="Phụ tùng tồn thấp" to="/inventory" linkLabel="Mở kho" /><StockList parts={data.parts} /></>;
  } else {
    metrics = [
      { label: 'Xe liên kết', value: data.vehicles.length, note: 'Phương tiện trong hồ sơ' },
      { label: 'Đang sửa chữa', value: allCustomerJobs.filter((job) => ACTIVE_STATUSES.includes(job.status)).length, note: 'Phiếu chưa hoàn thành' },
      { label: 'Chờ duyệt báo giá', value: pendingEstimates.length, note: 'Cần xem trong cổng khách hàng' },
      { label: 'Lịch sử sửa chữa', value: allCustomerJobs.length, note: 'Các lượt sửa xe đã ghi nhận' },
    ];
    mainSection = <><SectionHeading kicker="Lịch sử dịch vụ" title="Cập nhật xe gần đây" to="/portal" linkLabel="Mở cổng khách hàng" /><CustomerHistory vehicles={data.vehicles} histories={data.histories} /></>;
    sideSection = <><SectionHeading kicker="Báo giá" title="Đang chờ bạn xác nhận" to="/portal" linkLabel="Xem báo giá" />{pendingEstimates.length ? <ul className="role-dashboard-estimates">{pendingEstimates.slice(0, 4).map((estimate) => <li key={estimate.id}><span><strong><RepairOrderCode id={estimate.repair_job_id} /></strong><small>{estimate.license_plate} · {estimate.brand} {estimate.model}</small></span><b>{Number(estimate.total_amount).toLocaleString('vi-VN')} ₫</b></li>)}</ul> : <p className="role-dashboard-empty">Bạn không có báo giá nào đang chờ xác nhận.</p>}</>;
  }

  return (
    <div className="role-dashboard">
      <div className="page-header role-dashboard-heading">
        <div><p className="eyebrow">GARAGE WORKSHOP · {ROLE_INFO[role]?.title.toLocaleUpperCase('vi-VN')}</p><h1>{info.title}</h1><p>Xin chào {greetingName(user)}. {info.description}</p></div>
      </div>
      <QuickActions items={info.actions} />
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {loading ? <p className="role-dashboard-loading" role="status">Đang cập nhật số liệu...</p> : (
        <>
          <MetricStrip items={metrics} />
          <div className="role-dashboard-columns">
            <section className="role-dashboard-section">{mainSection}</section>
            <aside className="role-dashboard-section">{sideSection}</aside>
          </div>
        </>
      )}
    </div>
  );
}
