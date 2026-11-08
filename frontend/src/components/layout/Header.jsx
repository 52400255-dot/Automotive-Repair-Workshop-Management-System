import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const PAGE_CONTEXT = {
  '/': ['Vận hành xưởng', 'Tổng quan xưởng'],
  '/reception': ['Tiếp nhận & phiếu sửa chữa', 'Tiếp nhận xe'],
  '/repair-jobs': ['Tiếp nhận & phiếu sửa chữa', 'Phiếu sửa chữa'],
  '/vehicle-history': ['Tiếp nhận & phiếu sửa chữa', 'Lịch sử sửa chữa'],
  '/task-board': ['Tiếp nhận & phiếu sửa chữa', 'Bảng công việc'],
  '/inventory': ['Kho & phụ tùng', 'Kho phụ tùng'],
  '/customers': ['Khách hàng & xe', 'Khách hàng'],
  '/vehicles': ['Khách hàng & xe', 'Quản lý xe'],
  '/portal': ['Khách hàng & xe', 'Theo dõi sửa chữa'],
  '/admin/roles': ['Quản trị', 'Vai trò & phân quyền'],
};

export default function Header({ onMenuToggle, menuOpen = false }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [section, title] = PAGE_CONTEXT[pathname] || ['Garage Workshop', 'Trung tâm dịch vụ'];
  const initials = (user?.fullName || user?.email || 'U')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <header className="app-topbar">
      <div className="topbar-leading">
        <button
          type="button"
          className="menu-toggle"
          onClick={onMenuToggle}
          aria-label={menuOpen ? 'Đóng điều hướng' : 'Mở điều hướng'}
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
        >
          <span className={menuOpen ? 'menu-toggle-close' : 'menu-toggle-lines'} aria-hidden="true">
            {menuOpen ? '×' : <><i /><i /><i /></>}
          </span>
        </button>
        <div className="topbar-context">
          <span className="topbar-breadcrumb">Garage Workshop / {section}</span>
          <strong>{title}</strong>
        </div>
      </div>
      {user && (
        <div className="user-menu" aria-label="Người dùng hiện tại">
          <div className="user-avatar" aria-hidden="true">{initials}</div>
          <div className="user-meta">
            <span className="user-name">{user.fullName || user.email}</span>
            <span className="role-pill">Phiên làm việc</span>
          </div>
        </div>
      )}
    </header>
  );
}
