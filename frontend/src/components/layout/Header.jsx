/**
 * Header — Thanh tiêu đề: tên hệ thống + thông tin user + đăng xuất.
 */
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ROLE_LABELS = {
  customer: 'Khach hang',
  receptionist: 'Le tan',
  service_manager: 'Quan ly dich vu',
  mechanic: 'Tho may',
  warehouse_staff: 'Nhan vien kho',
  admin: 'Quan tri',
};

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header style={{
      height: 56, background: '#fff', borderBottom: '1px solid #e0e0e0',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px',
    }}>
      <strong>Automotive Repair Workshop Management</strong>
      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span>
            {user.fullName}
            {' '}<em style={{ color: '#757575' }}>({ROLE_LABELS[user.role] || user.role})</em>
          </span>
          <button className="btn btn-outline" onClick={handleLogout}>Dang xuat</button>
        </div>
      )}
    </header>
  );
}
