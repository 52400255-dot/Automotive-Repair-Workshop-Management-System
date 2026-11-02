import { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import RoleChangeDialog from '../../components/RoleChangeDialog';

const ROLE_OPTIONS = [
  { value: 'customer', label: 'Khách hàng' },
  { value: 'receptionist', label: 'Lễ tân' },
  { value: 'service_manager', label: 'Quản lý dịch vụ' },
  { value: 'mechanic', label: 'Thợ sửa chữa' },
  { value: 'warehouse_staff', label: 'Nhân viên kho' },
  { value: 'admin', label: 'Quản trị viên' },
];

const ROLE_LABELS = Object.fromEntries(ROLE_OPTIONS.map(({ value, label }) => [value, label]));

export default function RoleManagementPage() {
  const [users, setUsers] = useState([]);
  const [draftRoles, setDraftRoles] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [dialogError, setDialogError] = useState('');
  const [status, setStatus] = useState('');

  // Hàm tải danh sách người dùng từ API.
  // Dùng cho cả lúc mở trang lẫn sau khi đổi role thành công.
  // Trả về true nếu tải được, false nếu lỗi.
  const loadUsers = useCallback(async () => {
    setError('');
    try {
      const response = await api.get('/users');
      const loadedUsers = response.data.data;
      setUsers(loadedUsers);
      // Đặt lại ô chọn role theo đúng dữ liệu vừa tải
      setDraftRoles(Object.fromEntries(loadedUsers.map((user) => [user.id, user.role])));
      return true;
    } catch (loadError) {
      // Giữ nguyên thông báo lỗi do API trả về (401/403/...)
      setError(loadError.response?.data?.message || 'Không tải được danh sách người dùng.');
      return false;
    }
  }, []);

  // Tải dữ liệu lần đầu khi mở trang
  useEffect(() => {
    async function firstLoad() {
      await loadUsers();
      setLoading(false);
    }
    firstLoad();
  }, [loadUsers]);

  async function confirmRoleChange() {
    if (!selectedUser) return;

    const nextRole = draftRoles[selectedUser.id];
    setSaving(true);
    setDialogError('');
    setStatus('');
    try {
      // Gửi yêu cầu đổi role (admin đã xác nhận trong hộp thoại)
      await api.patch(`/users/${selectedUser.id}/role`, { role: nextRole });

      // Tải lại dữ liệu từ API để xác nhận role đã thật sự được lưu
      const reloaded = await loadUsers();
      setStatus(
        reloaded
          ? `Đã cập nhật vai trò cho ${selectedUser.full_name}.`
          : 'Đã gửi cập nhật nhưng chưa tải lại được dữ liệu để xác nhận.'
      );
      setSelectedUser(null);
    } catch (saveError) {
      setDialogError(saveError.response?.data?.message || 'Không cập nhật được vai trò.');
    } finally {
      setSaving(false);
    }
  }

  function openConfirmation(user) {
    setDialogError('');
    setStatus('');
    setSelectedUser(user);
  }

  return (
    <div className="legacy-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Quản trị truy cập</p>
          <h1>Vai trò &amp; phân quyền</h1>
          <p>Xem danh sách người dùng và cập nhật vai trò trong hệ thống.</p>
        </div>
      </div>

      <section className="card" aria-labelledby="role-status-heading">
        <h2 id="role-status-heading">Trạng thái kết nối</h2>
        {loading && <p role="status">Đang tải danh sách người dùng…</p>}
        {!loading && !error && <p role="status">Đã tải {users.length} người dùng từ hệ thống.</p>}
        {error && <p role="alert">{error}</p>}
        {status && <p role="status">{status}</p>}
      </section>

      <section aria-labelledby="user-list-heading">
        <h2 id="user-list-heading">Danh sách người dùng</h2>
        <div className="card table-wrapper">
          <table aria-labelledby="user-list-heading">
            <thead>
              <tr>
                <th scope="col">Mã người dùng</th>
                <th scope="col">Họ và tên</th>
                <th scope="col">Email</th>
                <th scope="col">Vai trò hiện tại</th>
                <th scope="col">Vai trò mới</th>
                <th scope="col">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6}>Đang tải dữ liệu…</td></tr>
              )}
              {!loading && !error && users.length === 0 && (
                <tr><td colSpan={6}>Chưa có người dùng.</td></tr>
              )}
              {!loading && !error && users.map((user) => {
                const nextRole = draftRoles[user.id] ?? user.role;
                return (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{user.full_name}</td>
                    <td>{user.email}</td>
                    <td>{ROLE_LABELS[user.role] ?? user.role}</td>
                    <td>
                      <label className="sr-only" htmlFor={`role-${user.id}`}>
                        Vai trò mới cho {user.email}
                      </label>
                      <select
                        id={`role-${user.id}`}
                        aria-label={`Vai trò mới cho ${user.email}`}
                        value={nextRole}
                        onChange={(event) => setDraftRoles((current) => ({
                          ...current,
                          [user.id]: event.target.value,
                        }))}
                        disabled={saving}
                      >
                        {ROLE_OPTIONS.map((role) => (
                          <option key={role.value} value={role.value}>{role.label}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={saving || nextRole === user.role}
                        onClick={() => openConfirmation(user)}
                      >
                        Lưu vai trò cho {user.email}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card" aria-labelledby="supported-roles-heading">
        <h2 id="supported-roles-heading">Các vai trò trong hệ thống</h2>
        <ul>
          {ROLE_OPTIONS.map((role) => (
            <li key={role.value}>
              {role.label} — <code>{role.value}</code>
            </li>
          ))}
        </ul>
      </section>

      <RoleChangeDialog
        open={Boolean(selectedUser)}
        targetUser={selectedUser}
        nextRole={selectedUser ? draftRoles[selectedUser.id] : ''}
        isSubmitting={saving}
        error={dialogError}
        onConfirm={confirmRoleChange}
        onCancel={() => {
          if (!saving) setSelectedUser(null);
        }}
      />
    </div>
  );
}
