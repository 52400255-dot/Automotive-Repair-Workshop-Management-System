/**
 * ReceptionPage — Giao diện Lễ tân tiếp nhận xe (Vehicle Service Intake — US04).
 * Quy trình:
 *   1. Chọn khách hàng
 *   2. Chọn xe của khách hàng
 *   3. Nhập yêu cầu / triệu chứng ban đầu
 *   4. Tùy chọn: Chọn trước các dịch vụ chuẩn
 *   5. Gửi API tạo phiếu sửa chữa (kích hoạt Stored Procedure nguyên tử)
 */
import { useEffect, useRef, useState } from 'react';
import api from '../../services/api';

export default function ReceptionPage() {
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [vehiclesError, setVehiclesError] = useState(false);
  const customerVersion = useRef(0);
  const submitting = useRef(false);
  const [servicesList, setServicesList] = useState([]);

  // Form State
  const [customerId, setCustomerId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [request, setRequest] = useState('');
  const [selectedServices, setSelectedServices] = useState([]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Tải danh sách khách hàng và danh mục dịch vụ từ Backend
  useEffect(() => {
    api.get('/customers')
      .then((r) => setCustomers(r.data.data || []))
      .catch((err) => setMessage({ text: 'Lỗi tải danh sách khách hàng: ' + (err.response?.data?.message || err.message), type: 'error' }));

    api.get('/services')
      .then((r) => setServicesList(r.data.data || []))
      .catch((err) => setMessage({ text: 'Lỗi tải danh mục dịch vụ: ' + (err.response?.data?.message || err.message), type: 'error' }));
  }, []);

  // Ignore responses belonging to a previous customer, including before effect cleanup.
  useEffect(() => {
    if (!customerId) return;
    let cancelled = false;
    const version = customerVersion.current;
    const active = () => !cancelled && version === customerVersion.current;
    api.get(`/customers/${customerId}/vehicles`)
      .then((r) => { if (active()) setVehicles(r.data.data || []); })
      .catch((err) => {
        if (active()) {
          setVehiclesError(true);
          setMessage({ text: 'Lỗi tải danh sách xe: ' + (err.response?.data?.message || err.message), type: 'error' });
        }
      })
      .finally(() => { if (active()) setVehiclesLoading(false); });
    return () => { cancelled = true; };
  }, [customerId]);

  function handleCustomerChange(value) {
    customerVersion.current += 1;
    setCustomerId(value);
    setVehicleId('');
    setVehicles([]);
    setVehiclesLoading(Boolean(value));
    setVehiclesError(false);
  }

  function toggleService(serviceId) {
    if (selectedServices.includes(serviceId)) {
      setSelectedServices(selectedServices.filter((id) => id !== serviceId));
    } else {
      setSelectedServices([...selectedServices, serviceId]);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting.current || vehiclesLoading || !vehicles.some(v => String(v.id) === String(vehicleId)) || !request.trim()) return;
    submitting.current = true;
    setMessage({ text: '', type: '' });
    setLoading(true);

    const payload = {
      vehicleId: Number(vehicleId),
      customerRequest: request,
      serviceItems: selectedServices.map((id) => ({
        serviceId: Number(id),
        quantity: 1,
      })),
    };

    try {
      const res = await api.post('/repair-jobs', payload);
      const createdJob = res.data.data;
      setMessage({
        text: `Tạo phiếu sửa chữa thành công #${createdJob?.id}! Trạng thái: Chờ phân công kỹ thuật viên.`,
        type: 'success',
      });

      // Reset form sau khi gửi thành công
      handleCustomerChange('');
      setRequest('');
      setSelectedServices([]);
    } catch (err) {
      setMessage({
        text: err.response?.data?.message || 'Lỗi khi tạo phiếu sửa chữa',
        type: 'error',
      });
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Tiếp nhận xe & Tạo phiếu sửa chữa (US04)</h1>
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 700 }}>
        {message.text && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '6px',
              marginBottom: 16,
              fontWeight: 600,
              backgroundColor: message.type === 'success' ? '#f6ffed' : '#fff2f0',
              border: `1px solid ${message.type === 'success' ? '#b7eb8f' : '#ffccc7'}`,
              color: message.type === 'success' ? '#389e0d' : '#cf1322',
            }}
          >
            {message.text}
          </div>
        )}

        {/* 1. Chọn Khách hàng */}
        <div className="form-group">
          <label style={{ fontWeight: 600 }}>1. Khách hàng (*)</label>
          <select
            className="form-control"
            disabled={loading}
            value={customerId}
            onChange={(e) => handleCustomerChange(e.target.value)}
            required
          >
            <option value="">-- Chọn khách hàng --</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name} — SĐT: {c.phone} {c.email ? `(${c.email})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Chọn Xe */}
        <div className="form-group">
          <label style={{ fontWeight: 600 }}>2. Phương tiện (*)</label>
          <select
            className="form-control"
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            disabled={!customerId || vehiclesLoading || loading}
            required
          >
            <option value="">
              {vehiclesLoading ? 'Đang tải xe...' : !customerId ? '-- Vui lòng chọn khách hàng trước --' : '-- Chọn xe cần tiếp nhận --'}
            </option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.license_plate} — {v.brand} {v.model} ({v.manufacture_year || 'N/A'})
              </option>
            ))}
          </select>
          {customerId && !vehiclesLoading && !vehiclesError && vehicles.length === 0 && (
            <small style={{ color: '#fa8c16', display: 'block', marginTop: 4 }}>
              Khách hàng này chưa có xe trong hệ thống.
            </small>
          )}
        </div>

        {/* 3. Mô tả yêu cầu */}
        <div className="form-group">
          <label style={{ fontWeight: 600 }}>3. Yêu cầu / Mô tả triệu chứng từ khách (*)</label>
          <textarea
            className="form-control"
            rows={4}
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            placeholder="Ví dụ: Xe khởi động khó, có tiếng kêu rít ở bánh trước khi rà phanh, đèn báo dầu nhấp nháy..."
            required
          />
        </div>

        {/* 4. Chọn Dịch vụ tiếp nhận ban đầu */}
        <div className="form-group">
          <label style={{ fontWeight: 600 }}>4. Dịch vụ ban đầu dự kiến (Tùy chọn)</label>
          <div
            style={{
              border: '1px solid #d9d9d9',
              borderRadius: '6px',
              padding: '12px',
              maxHeight: '220px',
              overflowY: 'auto',
              background: '#fafafa',
            }}
          >
            {servicesList.length === 0 ? (
              <span style={{ color: '#8c8c8c' }}>Chưa có dịch vụ trong danh mục.</span>
            ) : (
              servicesList.map((s) => (
                <div
                  key={s.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 0',
                    borderBottom: '1px solid #f0f0f0',
                  }}
                >
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', margin: 0 }}>
                    <input
                      type="checkbox"
                      value={s.id}
                      checked={selectedServices.includes(s.id)}
                      onChange={() => toggleService(s.id)}
                    />
                    <span>
                      <strong>{s.service_name}</strong>
                      {s.description && <span style={{ color: '#888', fontSize: '13px' }}> — {s.description}</span>}
                    </span>
                  </label>
                  <span style={{ fontWeight: 600, color: '#1890ff', whiteSpace: 'nowrap', marginLeft: 12 }}>
                    {Number(s.standard_price).toLocaleString('vi-VN')} đ
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Nút Submit */}
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading || vehiclesLoading || !customerId || !vehicles.some(v => String(v.id) === String(vehicleId)) || !request.trim()}
          style={{ marginTop: '16px', padding: '10px 24px', fontSize: '15px' }}
        >
          {loading ? 'Đang tạo phiếu...' : 'Tiếp nhận xe & Tạo phiếu'}
        </button>
      </form>
    </div>
  );
}
