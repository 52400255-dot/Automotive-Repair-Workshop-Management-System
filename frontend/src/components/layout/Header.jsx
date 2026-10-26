/**
 * Header — Thanh tiêu đề: tên hệ thống + thông tin user + đăng xuất.
 */
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ROLE_LABELS = {
  customer: 'Khách hàng',
  receptionist: 'Lễ tân',
  service_manager: 'Quản lý dịch vụ',
  mechanic: 'Thợ máy',
  warehouse_staff: 'Nhân viên kho',
  admin: 'Quản trị viên',
};

const PAGE_LABELS = {
  '/': 'Tổng quan xưởng',
  '/reception': 'Tiếp nhận xe',
  '/repair-jobs': 'Phiếu sửa chữa',
  '/vehicle-history': 'Lịch sử sửa chữa',
  '/task-board': 'Bảng công việc',
  '/inventory': 'Kho phụ tùng',
  '/customers': 'Khách hàng',
  '/vehicles': 'Quản lý xe',
  '/portal': 'Theo dõi sửa chữa',
};

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const initials = (user?.fullName || user?.email || 'U')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header className="app-topbar">
      <div className="topbar-context">
        <span>Garage Workshop · Không gian làm việc</span>
        <strong>{PAGE_LABELS[pathname] || 'Trung tâm dịch vụ'}</strong>
      </div>
      {user && (
        <div className="user-menu">
          <div className="user-avatar" aria-hidden="true">{initials}</div>
          <div className="user-meta">
            <span className="user-name">{user.fullName || user.email}</span>
            <span className="role-pill">{ROLE_LABELS[user.role] || user.role}</span>
          </div>
          <button className="btn btn-outline btn-logout" onClick={handleLogout}>
            Đăng xuất
          </button>
        </div>
      )}
    </header>
  );
}
