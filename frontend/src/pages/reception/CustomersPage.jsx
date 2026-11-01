import { useEffect, useState } from 'react';
import api from '../../services/api';

const emptyForm = {
  fullName: '',
  phone: '',
  email: '',
  address: '',
};

function getErrorMessage(error, fallback) {
  return error.response?.data?.message || fallback;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [notice, setNotice] = useState(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadCustomers() {
      setLoading(true);
      setLoadError('');

      try {
        const response = await api.get('/customers');

        if (active) {
          setCustomers(response.data.data || []);
        }
      } catch (error) {
        if (active) {
          setLoadError(
            getErrorMessage(error, 'Không tải được danh sách khách hàng.')
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadCustomers();

    return () => {
      active = false;
    };
  }, [reloadKey]);

  function reloadCustomers() {
    setReloadKey((current) => current + 1);
  }

  function showNotice(type, message) {
    setNotice({ type, message });
  }

  function handleCreateChange(event) {
    const { name, value } = event.target;

    setCreateForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleCreate(event) {
    event.preventDefault();

    if (creating) return;

    setCreating(true);
    setNotice(null);

    try {
      await api.post('/customers', {
        fullName: createForm.fullName.trim(),
        phone: createForm.phone.trim(),
        email: createForm.email.trim() || null,
        address: createForm.address.trim() || null,
      });

      setCreateForm(emptyForm);
      showNotice('success', 'Đã thêm khách hàng thành công.');
      reloadCustomers();
    } catch (error) {
      showNotice(
        'error',
        getErrorMessage(error, 'Không thể thêm khách hàng.')
      );
    } finally {
      setCreating(false);
    }
  }

  function openEditModal(customer) {
    setEditingCustomer(customer);
    setEditForm({
      fullName: customer.full_name || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
    });
    setNotice(null);
  }

  function closeEditModal() {
    if (updating) return;

    setEditingCustomer(null);
    setEditForm(emptyForm);
  }

  function handleEditChange(event) {
    const { name, value } = event.target;

    setEditForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleUpdate(event) {
    event.preventDefault();

    if (!editingCustomer || updating) return;

    setUpdating(true);
    setNotice(null);

    try {
      await api.put(`/customers/${editingCustomer.id}`, {
        fullName: editForm.fullName.trim(),
        phone: editForm.phone.trim(),
        email: editForm.email.trim() || null,
        address: editForm.address.trim() || null,
      });

      setEditingCustomer(null);
      setEditForm(emptyForm);
      showNotice('success', 'Đã cập nhật khách hàng thành công.');
      reloadCustomers();
    } catch (error) {
      showNotice(
        'error',
        getErrorMessage(error, 'Không thể cập nhật khách hàng.')
      );
    } finally {
      setUpdating(false);
    }
  }

  function openDeleteModal(customer) {
    setDeleteTarget(customer);
    setNotice(null);
  }

  function closeDeleteModal() {
    if (deleting) return;

    setDeleteTarget(null);
  }

  async function handleDelete() {
    if (!deleteTarget || deleting) return;

    setDeleting(true);
    setNotice(null);

    try {
      await api.delete(`/customers/${deleteTarget.id}`);

      setDeleteTarget(null);
      showNotice('success', 'Đã xóa khách hàng thành công.');
      reloadCustomers();
    } catch (error) {
      const message = error.response?.status === 409
        ? 'Chưa thể xóa khách hàng: trước tiên xóa các phiếu đủ điều kiện, sau đó xóa xe liên quan.'
        : getErrorMessage(error, 'Không thể xóa khách hàng.');

      setDeleteTarget(null);
      showNotice('error', message);
    } finally {
      setDeleting(false);
    }
  }

  const keyword = searchTerm.trim().toLocaleLowerCase('vi');

  const filteredCustomers = customers.filter((customer) => {
    const fullName = (customer.full_name || '').toLocaleLowerCase('vi');
    const phone = customer.phone || '';

    return fullName.includes(keyword) || phone.includes(keyword);
  });

  return (
    <div className="customers-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Hồ sơ khách hàng</p>
          <h1>Khách hàng</h1>
          <p>Lưu và cập nhật thông tin liên hệ của khách hàng tại gara.</p>
        </div>
      </div>

      {notice && (
        <div
          className={`alert ${
            notice.type === 'success' ? 'alert-success' : 'alert-error'
          }`}
          role={notice.type === 'success' ? 'status' : 'alert'}
        >
          {notice.message}
        </div>
      )}

      {loadError && (
        <div className="alert alert-error" role="alert">
          {loadError}{' '}
          <button
            type="button"
            className="btn btn-outline"
            onClick={reloadCustomers}
          >
            Thử lại
          </button>
        </div>
      )}

      <form
        className="card customer-create-form"
        style={{
          marginBottom: 16,
          display: 'flex',
          gap: 12,
          alignItems: 'flex-end',
          flexWrap: 'wrap',
        }}
        onSubmit={handleCreate}
      >
        <div
          className="form-group"
          style={{ margin: 0, flex: 1, minWidth: 180 }}
        >
          <label htmlFor="create-full-name">Họ và tên (*)</label>
          <input
            id="create-full-name"
            name="fullName"
            className="form-control"
            value={createForm.fullName}
            onChange={handleCreateChange}
            disabled={creating}
            maxLength={150}
            required
          />
        </div>

        <div
          className="form-group"
          style={{ margin: 0, flex: 1, minWidth: 150 }}
        >
          <label htmlFor="create-phone">Số điện thoại (*)</label>
          <input
            id="create-phone"
            name="phone"
            className="form-control"
            value={createForm.phone}
            onChange={handleCreateChange}
            disabled={creating}
            maxLength={20}
            required
          />
        </div>

        <div
          className="form-group"
          style={{ margin: 0, flex: 1, minWidth: 190 }}
        >
          <label htmlFor="create-email">Email</label>
          <input
            id="create-email"
            name="email"
            type="email"
            className="form-control"
            value={createForm.email}
            onChange={handleCreateChange}
            disabled={creating}
            maxLength={255}
          />
        </div>

        <div
          className="form-group"
          style={{ margin: 0, flex: 1, minWidth: 220 }}
        >
          <label htmlFor="create-address">Địa chỉ</label>
          <input
            id="create-address"
            name="address"
            className="form-control"
            value={createForm.address}
            onChange={handleCreateChange}
            disabled={creating}
            maxLength={255}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={
            creating ||
            !createForm.fullName.trim() ||
            !createForm.phone.trim()
          }
        >
          {creating ? 'Đang lưu...' : 'Thêm khách hàng'}
        </button>
      </form>

      <div className="card table-card">
        <div className="page-toolbar">
          <input
            className="form-control"
            type="search"
            placeholder="Tìm theo tên hoặc số điện thoại..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />

          <span className="record-count">
            Hiển thị {filteredCustomers.length}/{customers.length} khách hàng
          </span>
        </div>

        {loading && <p role="status">Đang tải khách hàng...</p>}

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Mã KH</th>
                <th>Họ và tên</th>
                <th>Số điện thoại</th>
                <th>Email</th>
                <th>Địa chỉ</th>
                <th>Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {filteredCustomers.map((customer) => (
                <tr key={customer.id}>
                  <td>#{customer.id}</td>
                  <td>{customer.full_name}</td>
                  <td>{customer.phone}</td>
                  <td>{customer.email || '—'}</td>
                  <td>{customer.address || '—'}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => openEditModal(customer)}
                      >
                        Sửa
                      </button>

                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => openDeleteModal(customer)}
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!loading && !loadError && filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    {searchTerm.trim()
                      ? 'Không tìm thấy khách hàng phù hợp.'
                      : 'Chưa có khách hàng nào trong hệ thống.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingCustomer && (
        <div className="modal-backdrop">
          <div
            className="modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-customer-title"
          >
            <div className="modal-header">
              <h2 id="edit-customer-title">Sửa khách hàng</h2>

              <button
                type="button"
                className="btn btn-outline"
                onClick={closeEditModal}
                disabled={updating}
                aria-label="Đóng"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdate}>
              <div className="form-group">
                <label htmlFor="edit-full-name">Họ và tên (*)</label>
                <input
                  id="edit-full-name"
                  name="fullName"
                  className="form-control"
                  value={editForm.fullName}
                  onChange={handleEditChange}
                  disabled={updating}
                  maxLength={150}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-phone">Số điện thoại (*)</label>
                <input
                  id="edit-phone"
                  name="phone"
                  className="form-control"
                  value={editForm.phone}
                  onChange={handleEditChange}
                  disabled={updating}
                  maxLength={20}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-email">Email</label>
                <input
                  id="edit-email"
                  name="email"
                  type="email"
                  className="form-control"
                  value={editForm.email}
                  onChange={handleEditChange}
                  disabled={updating}
                  maxLength={255}
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-address">Địa chỉ</label>
                <input
                  id="edit-address"
                  name="address"
                  className="form-control"
                  value={editForm.address}
                  onChange={handleEditChange}
                  disabled={updating}
                  maxLength={255}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={closeEditModal}
                  disabled={updating}
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={
                    updating ||
                    !editForm.fullName.trim() ||
                    !editForm.phone.trim()
                  }
                >
                  {updating ? 'Đang cập nhật...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-backdrop">
          <div
            className="modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-customer-title"
          >
            <div className="modal-header">
              <h2 id="delete-customer-title">Xác nhận xóa khách hàng</h2>
            </div>

            <p>
              Bạn có chắc muốn xóa khách hàng{' '}
              <strong>{deleteTarget.full_name}</strong>?
            </p>

            <p style={{ marginTop: 8, color: 'var(--text-secondary)' }}>
              Để xóa khách hàng, trước tiên xóa các phiếu sửa chữa đủ điều kiện,
              rồi xóa xe liên quan trong mục Quản lý xe. Phiếu đã duyệt, bắt đầu
              sửa, dùng phụ tùng hoặc có hóa đơn sẽ được giữ lại. Tài khoản khách
              liên kết (nếu có) cũng sẽ bị xóa cùng hồ sơ.
            </p>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={closeDeleteModal}
                disabled={deleting}
              >
                Hủy
              </button>

              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Đang xóa...' : 'Xóa khách hàng'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
