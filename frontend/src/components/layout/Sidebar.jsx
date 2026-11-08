import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ROLE_LABELS = {
  customer: 'Khách hàng',
  receptionist: 'Lễ tân',
  service_manager: 'Quản lý dịch vụ',
  mechanic: 'Thợ máy',
  warehouse_staff: 'Nhân viên kho',
  admin: 'Quản trị viên',
};

const NAV_GROUPS = [
  {
    label: 'Tổng quan',
    items: [
      { to: '/', label: 'Tổng quan xưởng', icon: 'dashboard', roles: ['receptionist', 'service_manager', 'mechanic', 'warehouse_staff', 'admin'] },
    ],
  },
  {
    label: 'Tiếp nhận & phiếu sửa chữa',
    items: [
      { to: '/reception', label: 'Tiếp nhận xe', icon: 'reception', roles: ['receptionist'] },
      { to: '/repair-jobs', label: 'Phiếu sửa chữa', icon: 'repairs', roles: ['receptionist', 'service_manager', 'admin'] },
      { to: '/task-board', label: 'Bảng công việc', icon: 'tasks', roles: ['mechanic'] },
      { to: '/vehicle-history', label: 'Lịch sử sửa chữa', icon: 'history', roles: ['receptionist', 'service_manager', 'admin'] },
    ],
  },
  {
    label: 'Khách hàng & xe',
    items: [
      { to: '/customers', label: 'Khách hàng', icon: 'customers', roles: ['receptionist', 'admin'] },
      { to: '/vehicles', label: 'Quản lý xe', icon: 'vehicles', roles: ['receptionist', 'admin'] },
      { to: '/portal', label: 'Theo dõi sửa chữa', icon: 'portal', roles: ['customer'] },
    ],
  },
  {
    label: 'Kho & phụ tùng',
    items: [
      { to: '/inventory', label: 'Kho phụ tùng', icon: 'inventory', roles: ['warehouse_staff', 'service_manager', 'receptionist', 'admin'] },
    ],
  },
  {
    label: 'Quản trị',
    items: [
      { to: '/admin/roles', label: 'Vai trò & phân quyền', icon: 'customers', roles: ['admin'] },
    ],
  },
];

function NavigationIcon({ name }) {
  const paths = {
    dashboard: <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></>,
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

export default function Sidebar({ isOpen = false, onNavigate }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => user && item.roles.includes(user.role)),
  })).filter((group) => group.items.length > 0);
  function handleLogout() {
    logout();
    navigate('/login');
    onNavigate?.();
  }

  return (
    <aside id="primary-navigation" className={`app-sidebar${isOpen ? ' is-open' : ''}`} aria-label="Điều hướng chính">
      <div className="sidebar-brand">
        <div className="brand-mark" aria-hidden="true">G</div>
        <div className="sidebar-brand-copy">
          <span>Garage Workshop</span>
          <strong>Quản lý xưởng sửa chữa ô tô</strong>
        </div>
      </div>

      <nav className="sidebar-groups" aria-label="Khu vực làm việc">
        {groups.map((group) => (
          <div className="sidebar-group" key={group.label}>
            <p className="sidebar-group-label">{group.label}</p>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `sidebar-link${isActive ? ' is-active' : ''}`}
                onClick={onNavigate}
                title={item.label}
                aria-label={item.label}
              >
                <NavigationIcon name={item.icon} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {user && (
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <strong title={user.fullName || user.email}>{user.fullName || user.email}</strong>
            <span>{ROLE_LABELS[user.role] || user.role}</span>
          </div>
          <button type="button" className="btn btn-outline sidebar-logout" onClick={handleLogout} aria-label="Đăng xuất">
            <svg className="sidebar-logout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10 17l5-5-5-5M15 12H3" />
              <path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" />
            </svg>
            <span>Đăng xuất</span>
          </button>
        </div>
      )}
    </aside>
  );
}
