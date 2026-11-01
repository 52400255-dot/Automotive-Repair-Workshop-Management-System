import { useEffect, useState } from 'react';
import api from '../../services/api';

const emptyVehicleForm = {
  customerId: '',
  licensePlate: '',
  brand: '',
  model: '',
  manufactureYear: '',
  odometerKm: '',
};

function getErrorMessage(error, fallback) {
  return error.response?.data?.message || fallback;
}

function buildPayload(form) {
  return {
    customerId: Number(form.customerId),
    licensePlate: form.licensePlate.trim().toUpperCase(),
    brand: form.brand.trim(),
    model: form.model.trim(),
    manufactureYear:
      form.manufactureYear === ''
        ? null
        : Number(form.manufactureYear),
    odometerKm:
      form.odometerKm === ''
        ? null
        : Number(form.odometerKm),
  };
}

function VehicleFormFields({
  prefix,
  form,
  customers,
  disabled,
  onChange,
}) {
  return (
    <>
      <div className="form-group">
        <label htmlFor={`${prefix}-customer`}>Chủ sở hữu (*)</label>
        <select
          id={`${prefix}-customer`}
          name="customerId"
          className="form-control"
          value={form.customerId}
          onChange={onChange}
          disabled={disabled}
          required
        >
          <option value="">-- Chọn khách hàng --</option>

          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.full_name} — {customer.phone}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor={`${prefix}-license-plate`}>Biển số (*)</label>
        <input
          id={`${prefix}-license-plate`}
          name="licensePlate"
          className="form-control"
          value={form.licensePlate}
          onChange={onChange}
          disabled={disabled}
          maxLength={20}
          placeholder="Ví dụ: 51A-12345"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor={`${prefix}-brand`}>Hãng xe (*)</label>
        <input
          id={`${prefix}-brand`}
          name="brand"
          className="form-control"
          value={form.brand}
          onChange={onChange}
          disabled={disabled}
          maxLength={100}
          placeholder="Ví dụ: Toyota"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor={`${prefix}-model`}>Dòng xe (*)</label>
        <input
          id={`${prefix}-model`}
          name="model"
          className="form-control"
          value={form.model}
          onChange={onChange}
          disabled={disabled}
          maxLength={100}
          placeholder="Ví dụ: Vios"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor={`${prefix}-year`}>Năm sản xuất</label>
        <input
          id={`${prefix}-year`}
          name="manufactureYear"
          type="number"
          className="form-control"
          value={form.manufactureYear}
          onChange={onChange}
          disabled={disabled}
          min="1"
          max="9999"
          placeholder="Ví dụ: 2022"
        />
      </div>

      <div className="form-group">
        <label htmlFor={`${prefix}-odometer`}>
          Số kilomet hiện tại
        </label>
        <input
          id={`${prefix}-odometer`}
          name="odometerKm"
          type="number"
          className="form-control"
          value={form.odometerKm}
          onChange={onChange}
          disabled={disabled}
          min="0"
          max="99999999"
          placeholder="Ví dụ: 45000"
        />
      </div>
    </>
  );
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [createForm, setCreateForm] = useState(emptyVehicleForm);
  const [editForm, setEditForm] = useState(emptyVehicleForm);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
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

    async function loadData() {
      setLoading(true);
      setLoadError('');

      try {
        const [vehicleResponse, customerResponse] = await Promise.all([
          api.get('/vehicles'),
          api.get('/customers'),
        ]);

        if (active) {
          setVehicles(vehicleResponse.data.data || []);
          setCustomers(customerResponse.data.data || []);
        }
      } catch (error) {
        if (active) {
          setLoadError(
            getErrorMessage(
              error,
              'Không tải được danh sách xe và khách hàng.'
            )
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, [reloadKey]);

  function reloadData() {
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

  function openCreateModal() {
    setCreateForm(emptyVehicleForm);
    setNotice(null);
    setShowCreateModal(true);
  }

  function closeCreateModal() {
    if (creating) return;

    setShowCreateModal(false);
    setCreateForm(emptyVehicleForm);
  }

  async function handleCreate(event) {
    event.preventDefault();

    if (creating) return;

    setCreating(true);
    setNotice(null);

    try {
      await api.post('/vehicles', buildPayload(createForm));

      setShowCreateModal(false);
      setCreateForm(emptyVehicleForm);
      showNotice('success', 'Đã thêm xe thành công.');
      reloadData();
    } catch (error) {
      showNotice(
        'error',
        getErrorMessage(error, 'Không thể thêm xe.')
      );
    } finally {
      setCreating(false);
    }
  }

  function openEditModal(vehicle) {
    setEditingVehicle(vehicle);
    setEditForm({
      customerId: String(vehicle.customer_id),
      licensePlate: vehicle.license_plate || '',
      brand: vehicle.brand || '',
      model: vehicle.model || '',
      manufactureYear:
        vehicle.manufacture_year == null
          ? ''
          : String(vehicle.manufacture_year),
      odometerKm:
        vehicle.odometer_km == null
          ? ''
          : String(vehicle.odometer_km),
    });
    setNotice(null);
  }

  function closeEditModal() {
    if (updating) return;

    setEditingVehicle(null);
    setEditForm(emptyVehicleForm);
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

    if (!editingVehicle || updating) return;

    setUpdating(true);
    setNotice(null);

    try {
      await api.put(
        `/vehicles/${editingVehicle.id}`,
        buildPayload(editForm)
      );

      setEditingVehicle(null);
      setEditForm(emptyVehicleForm);
      showNotice('success', 'Đã cập nhật xe thành công.');
      reloadData();
    } catch (error) {
      showNotice(
        'error',
        getErrorMessage(error, 'Không thể cập nhật xe.')
      );
    } finally {
      setUpdating(false);
    }
  }

  function openDeleteModal(vehicle) {
    setDeleteTarget(vehicle);
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
      await api.delete(`/vehicles/${deleteTarget.id}`);

      setDeleteTarget(null);
      showNotice('success', 'Đã xóa xe thành công.');
      reloadData();
    } catch (error) {
      const message = error.response?.status === 409
        ? 'Không thể xóa xe vì vẫn còn phiếu sửa chữa liên quan. Hãy xóa các phiếu đủ điều kiện trước.'
        : getErrorMessage(error, 'Không thể xóa xe.');

      setDeleteTarget(null);
      showNotice('error', message);
    } finally {
      setDeleting(false);
    }
  }

  const keyword = searchTerm.trim().toLocaleLowerCase('vi');

  const filteredVehicles = vehicles.filter((vehicle) => {
    const licensePlate = (
      vehicle.license_plate || ''
    ).toLocaleLowerCase('vi');

    const customerName = (
      vehicle.customer_name || ''
    ).toLocaleLowerCase('vi');

    return (
      licensePlate.includes(keyword) ||
      customerName.includes(keyword)
    );
  });

  return (
    <div className="vehicles-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Danh mục phương tiện</p>
          <h1>Quản lý xe</h1>
          <p>Quản lý biển số, thông tin xe và chủ sở hữu trong hệ thống.</p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={openCreateModal}
        >
          Thêm xe
        </button>
      </div>

      {notice && (
        <div
          className={`alert ${
            notice.type === 'success'
              ? 'alert-success'
              : 'alert-error'
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
            onClick={reloadData}
          >
            Thử lại
          </button>
        </div>
      )}

      <div className="card table-card">
        <div className="page-toolbar">
          <input
            type="search"
            className="form-control"
            placeholder="Tìm theo biển số hoặc tên chủ sở hữu..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />

          <span className="record-count">
            Hiển thị {filteredVehicles.length}/{vehicles.length} xe
          </span>
        </div>

        {loading && <p role="status">Đang tải danh sách xe...</p>}

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Mã xe</th>
                <th>Biển số</th>
                <th>Hãng xe</th>
                <th>Dòng xe</th>
                <th>Năm sản xuất</th>
                <th>Số kilomet</th>
                <th>Chủ sở hữu</th>
                <th>Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {filteredVehicles.map((vehicle) => (
                <tr key={vehicle.id}>
                  <td>#{vehicle.id}</td>
                  <td>
                    <strong>{vehicle.license_plate}</strong>
                  </td>
                  <td>{vehicle.brand}</td>
                  <td>{vehicle.model}</td>
                  <td>{vehicle.manufacture_year || '—'}</td>
                  <td>
                    {vehicle.odometer_km == null
                      ? '—'
                      : `${Number(
                          vehicle.odometer_km
                        ).toLocaleString('vi-VN')} km`}
                  </td>
                  <td>{vehicle.customer_name}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => openEditModal(vehicle)}
                      >
                        Sửa
                      </button>

                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => openDeleteModal(vehicle)}
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!loading &&
                !loadError &&
                filteredVehicles.length === 0 && (
                  <tr>
                    <td colSpan={8}>
                      {searchTerm.trim()
                        ? 'Không tìm thấy xe phù hợp.'
                        : 'Chưa có xe trong hệ thống.'}
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && (
        <div className="modal-backdrop">
          <div
            className="modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-vehicle-title"
          >
            <div className="modal-header">
              <h2 id="create-vehicle-title">Thêm xe mới</h2>

              <button
                type="button"
                className="btn btn-outline"
                onClick={closeCreateModal}
                disabled={creating}
                aria-label="Đóng"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <VehicleFormFields
                prefix="create-vehicle"
                form={createForm}
                customers={customers}
                disabled={creating}
                onChange={handleCreateChange}
              />

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={closeCreateModal}
                  disabled={creating}
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={
                    creating ||
                    !createForm.customerId ||
                    !createForm.licensePlate.trim() ||
                    !createForm.brand.trim() ||
                    !createForm.model.trim()
                  }
                >
                  {creating ? 'Đang lưu...' : 'Thêm xe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingVehicle && (
        <div className="modal-backdrop">
          <div
            className="modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-vehicle-title"
          >
            <div className="modal-header">
              <h2 id="edit-vehicle-title">Sửa thông tin xe</h2>

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
              <VehicleFormFields
                prefix="edit-vehicle"
                form={editForm}
                customers={customers}
                disabled={updating}
                onChange={handleEditChange}
              />

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
                    !editForm.customerId ||
                    !editForm.licensePlate.trim() ||
                    !editForm.brand.trim() ||
                    !editForm.model.trim()
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
            aria-labelledby="delete-vehicle-title"
          >
            <div className="modal-header">
              <h2 id="delete-vehicle-title">Xác nhận xóa xe</h2>
            </div>

            <p>
              Bạn có chắc muốn xóa xe biển số{' '}
              <strong>{deleteTarget.license_plate}</strong>?
            </p>

            <p
              style={{
                marginTop: 8,
                color: 'var(--text-secondary)',
              }}
            >
              Hãy xóa các phiếu sửa chữa đủ điều kiện trước. Xe còn phiếu đã duyệt,
              bắt đầu sửa, dùng phụ tùng hoặc có hóa đơn sẽ không thể bị xóa.
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
                {deleting ? 'Đang xóa...' : 'Xóa xe'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
