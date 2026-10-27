/**
 * Sidebar — Điều hướng theo vai trò người dùng (RBAC phía UI).
 * Mỗi role chỉ thấy các trang thuộc phạm vi công việc của mình.
 */
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { to: '/', label: 'Tổng quan', icon: 'dashboard', roles: ['receptionist', 'service_manager', 'mechanic', 'warehouse_staff', 'admin'] },
  { to: '/reception', label: 'Tiếp nhận xe', icon: 'reception', roles: ['receptionist'] },
  { to: '/repair-jobs', label: 'Phiếu sửa chữa', icon: 'repairs', roles: ['receptionist', 'service_manager', 'admin'] },
  { to: '/vehicle-history', label: 'Lịch sử sửa chữa', icon: 'history', roles: ['receptionist', 'service_manager', 'admin'] },
  { to: '/task-board', label: 'Bảng công việc', icon: 'tasks', roles: ['mechanic'] },
  { to: '/inventory', label: 'Kho phụ tùng', icon: 'inventory', roles: ['warehouse_staff', 'receptionist', 'admin'] },
  { to: '/customers', label: 'Khách hàng', icon: 'customers', roles: ['receptionist', 'admin'] },
  { to: '/vehicles', label: 'Quản lý xe', icon: 'vehicles', roles: ['receptionist', 'admin'] },
  { to: '/portal', label: 'Theo dõi sửa chữa', icon: 'portal', roles: ['customer'] },
];

function NavigationIcon({ name }) {
  const paths = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    reception: <><path d="M12 5v14M5 12h14" /><circle cx="12" cy="12" r="9" /></>,
    repairs: <><path d="M8 4h8l2 3v13H6V7l2-3Z" /><path d="M9 4v4h6V4M9 12h6M9 16h4" /></>,
    history: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2M3 4v4h4" /></>,
    tasks: <><path d="m14 6 4-3 3 3-3 4M13 7l4 4M4 20l7-7M5 10a5 5 0 0 0 6 6" /><path d="m3 21 5-5" /></>,
    inventory: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="M3 8v9l9 5 9-5V8M12 13v9" /></>,
    customers: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 5.5a3.5 3.5 0 0 1 0 6.8M18 14a5.5 5.5 0 0 1 3.5 5" /></>,
    vehicles: <><path d="m4 11 1.6-4.4A2.5 2.5 0 0 1 8 5h8a2.5 2.5 0 0 1 2.4 1.6L20 11v8h-2v-2H6v2H4v-8Z" /><path d="M4 11h16M7 14h.01M17 14h.01" /></>,
    portal: <><path d="M4 12h15M13 6l6 6-6 6" /><path d="M5 4h6M5 20h6" /></>,
  };

  return (
    <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

export default function Sidebar() {
  const { user } = useAuth();
  const items = NAV_ITEMS.filter((it) => user && it.roles.includes(user.role));

  return (
    <aside className="app-sidebar" aria-label="Điều hướng chính">
      <div className="sidebar-brand">
        <div className="brand-mark" aria-hidden="true">G</div>
        <div className="sidebar-brand-copy">
          <span>GARAGE MANAGEMENT</span>
          <strong>Workshop</strong>
        </div>
      </div>

      <p className="sidebar-section-label">Điều hướng</p>
      <nav aria-label="Khu vực làm việc">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.to === '/'}
            className={({ isActive }) => `sidebar-link${isActive ? ' is-active' : ''}`}
          >
            <NavigationIcon name={it.icon} />
            <span>{it.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <strong>Automotive Repair</strong>
        Nhóm 12 · Quản lý xưởng
      </div>
    </aside>
  );
}
