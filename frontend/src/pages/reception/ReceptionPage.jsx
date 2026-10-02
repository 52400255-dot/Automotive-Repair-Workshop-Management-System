/**
 * ReceptionPage — Giao diện Lễ tân tiếp nhận xe (Vehicle Service Intake).
 * Bước 1: chọn khách hàng → 2: chọn xe → 3: ghi yêu cầu → tạo phiếu sửa chữa.
 */
import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function ReceptionPage() {
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [request, setRequest] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get('/customers').then((r) => setCustomers(r.data.data));
  }, []);

  // Khi chọn khách hàng → tải danh sách xe của người đó
  useEffect(() => {
    if (!customerId) return;
    api.get(`/customers/${customerId}/vehicles`).then((r) => setVehicles(r.data.data));
  }, [customerId]);

  /** Đổi khách hàng thì reset xe đã chọn (xử lý trong event handler, không làm trong effect) */
  function handleCustomerChange(value) {
    setCustomerId(value);
    setVehicleId('');
    setVehicles([]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage('');
    try {
      const res = await api.post('/repair-jobs', { vehicleId, customerRequest: request });
      setMessage(`Tao phieu sua chua #${res.data.data.id} thanh cong`);
      handleCustomerChange('');
      setRequest('');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Loi tao phieu');
    }
  }

  return (
    <div>
      <div className="page-header"><h1>Tiep nhan xe</h1></div>
      <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 560 }}>
        {message && (
          <p style={{ color: message.startsWith('Tao') ? 'var(--success)' : 'var(--error)', marginBottom: 12 }}>
            {message}
          </p>
        )}

        <div className="form-group">
          <label>Khach hang</label>
          <select className="form-control" value={customerId}
            onChange={(e) => handleCustomerChange(e.target.value)} required>
            <option value="">-- Chon khach hang --</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.full_name} — {c.phone}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label>Xe</label>
          <select className="form-control" value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)} disabled={!customerId} required>
            <option value="">-- Chon xe --</option>
            {vehicles.map((v) => <option key={v.id} value={v.id}>{v.license_plate} — {v.brand} {v.model}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label>Yeu cau / mo ta cua khach</label>
          <textarea className="form-control" rows={4} value={request}
            onChange={(e) => setRequest(e.target.value)}
            placeholder="Vi du: xe khoi dong kem, co tieng loc coc khi thang du..." />
        </div>

        <button className="btn btn-primary">Tao phieu sua chua</button>
      </form>
    </div>
  );
}
