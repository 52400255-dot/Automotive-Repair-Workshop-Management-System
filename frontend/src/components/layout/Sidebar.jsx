/**
 * Sidebar — Điều hướng theo vai trò người dùng (RBAC phía UI).
 * Mỗi role chỉ thấy các trang thuộc phạm vi công việc của mình.
 */
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', roles: ['receptionist', 'service_manager', 'mechanic', 'warehouse_staff', 'admin'] },
  { to: '/reception', label: 'Tiep nhan xe', roles: ['receptionist'] },
  { to: '/repair-jobs', label: 'Phieu sua chua', roles: ['receptionist', 'service_manager', 'admin'] },
  { to: '/task-board', label: 'Bang cong viec', roles: ['mechanic'] },
  { to: '/inventory', label: 'Kho phu tung', roles: ['warehouse_staff', 'receptionist', 'admin'] },
  { to: '/customers', label: 'Khach hang', roles: ['receptionist', 'admin'] },
  { to: '/portal', label: 'Cua ban theo doi', roles: ['customer'] },
];

const linkStyle = ({ isActive }) => ({
  display: 'block',
  padding: '10px 20px',
  color: isActive ? '#1976d2' : '#424242',
  background: isActive ? '#e3f2fd' : 'transparent',
  borderRight: isActive ? '3px solid #1976d2' : '3px solid transparent',
  fontWeight: isActive ? 600 : 400,
  textDecoration: 'none',
});

export default function Sidebar() {
  const { user } = useAuth();
  const items = NAV_ITEMS.filter((it) => user && it.roles.includes(user.role));

  return (
    <aside style={{
      width: 230, flexShrink: 0, background: '#fff',
      borderRight: '1px solid #e0e0e0', paddingTop: 16,
    }}>
      <div style={{ padding: '0 20px 16px', fontWeight: 700, fontSize: 15, color: '#1976d2' }}>
        Garage MS
      </div>
      <nav>
        {items.map((it) => (
          <NavLink key={it.to} to={it.to} end={it.to === '/'} style={linkStyle}>
            {it.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
