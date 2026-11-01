import { useEffect, useState } from 'react';
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

  useEffect(() => {
    let active = true;

    async function loadUsers() {
      setLoading(true);
      setError('');
      try {
        const response = await api.get('/users');
        if (!active) return;
        const loadedUsers = response.data.data;
        setUsers(loadedUsers);
        setDraftRoles(Object.fromEntries(loadedUsers.map((user) => [user.id, user.role])));
      } catch (loadError) {
        if (active) {
          setError(loadError.response?.data?.message || 'Không tải được danh sách người dùng.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadUsers();
    return () => { active = false; };
  }, []);

  async function confirmRoleChange() {
    if (!selectedUser) return;

    const nextRole = draftRoles[selectedUser.id];
    setSaving(true);
    setDialogError('');
    setStatus('');
    try {
      const response = await api.patch(`/users/${selectedUser.id}/role`, { role: nextRole });
      const updatedUser = response.data.data;
      setUsers((currentUsers) => currentUsers.map((user) => (
        user.id === updatedUser.id ? updatedUser : user
      )));
      setDraftRoles((currentRoles) => ({ ...currentRoles, [updatedUser.id]: updatedUser.role }));
      setStatus(`Đã cập nhật vai trò cho ${updatedUser.full_name}.`);
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
