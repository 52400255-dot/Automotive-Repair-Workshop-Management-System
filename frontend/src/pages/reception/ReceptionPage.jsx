/**
 * ReceptionPage — Giao diện Lễ tân tiếp nhận xe (Vehicle Service Intake).
 * Bước 1: chọn khách hàng → 2: chọn xe → 3: ghi yêu cầu → tạo phiếu sửa chữa.
 */
import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function ReceptionPage() {
  // 1. Quản lý State
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  const [partsList, setPartsList] = useState([]);
  // Form State
  const [customerId, setCustomerId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [request, setRequest] = useState('');
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedParts, setSelectedParts] = useState([]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get('/customers')
    .then((r) => setCustomers(r.data.data))
    .catch(() => {
      //Mock data
      setCustomers([
        { id: 1, full_name: 'Nguyễn Văn A', phone: '0901234567'},
        { id: 2, full_name: 'Trần Thị B', phone: '0987654321'}
      ]);
    });

    // Tải danh mục Dịch Vụ
    api.get('/services')
      .then((r) => setServicesList(r.data.data || r.data))
      .catch(() => {
        setServicesList([
          { id: 1, name: 'Thay nhớt máy', price: 150000 },
          { id: 2, name: 'Kiểm tra & Bảo dưỡng phanh', price: 200000 }
        ]);
      });

      api.get('/inventory')
        .then((r) => setPartsList(r.data.data || r.data))
        .catch(() => {
          setPartsList([
            { id: 101, name: 'Nhớt Castrol 4L', price: 450000 },
            { id: 102, name: 'Má phanh trước Toyota', price: 650000 }
          ]);
        });
  }, []);

  // Khi chọn khách hàng → tải danh sách xe của người đó
  useEffect(() => {
    if (!customerId) return;
    api.get(`/customers/${customerId}/vehicles`)
    .then((r) => setVehicles(r.data.data))
    .catch(() => {
      setVehicles([
        { id: 10, license_plate: '51H-123.45', brand: 'Toyota', model: 'Camry' },
        { id: 11, license_plate: '29A-678.90', brand: 'Honda', model: 'Civic' }
      ]);
    });
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
    setLoading(true);

    const payLoad = {
      customerId,
      vehicleId,
      customerRequest: request,
      services: selectedServices,
      parts: selectedParts
    };

    try {
      const res = await api.post('/repair-jobs',payLoad);
      setMessage(`Tao phieu sua chua #${res.data.data?.id || 'thanh cong'}`);

      //Reset form sau khi gui thanh cong
      handleCustomerChange('');
      setRequest('');
      setSelectedServices([]);
      setSelectedParts([]);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Loi tao phieu sua chua');
    } finally { 
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Tiep nhan xe & Tao phieu sua chua</h1>
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 650 }}>
        {message && (
          <p style={{ color: message.startsWith('Tao') ? 'var(--success)' : 'var(--error)', marginBottom: 12, fontWeight: 'bold' }}>
            {message}
          </p>
        )}

        {/*1. Chọn Khách hàng */}
        <div className="form-group">
          <label>1. Khach hang (*)</label>
          <select 
            className="form-control"
            value={customerId}
            onChange={(e) => handleCustomerChange(e.target.value)} 
            required
          >
            <option value="">-- Chon khach hang --</option>
            {customers.map((c) =>(
               <option key={c.id} value={c.id}>{c.full_name} — {c.phone}</option>
            ))}
          </select>
        </div>
        
        {/*2. Chọn Xe */}
        <div className="form-group">
          <label>2. Xe (*)</label>
          <select
              className="form-control"
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)} disabled={!customerId}
              required
          >
            <option value="">-- Chon xe --</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.license_plate} — {v.brand} {v.model}</option>
            ))}
          </select>
        </div>

        {/* 3. Mô tả yêu cầu */}
        <div className="form-group">
          <label>3. Yeu cau / mo ta cua khach (*)</label>
          <textarea
            className="form-control"
            rows={4}
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            placeholder="Vi du: xe khoi dong kem, co tieng loc coc khi thang du..."
            required
          />
        </div>

        {/* 4. Chọn Dịch vụ & Phụ tùng */}
        <div className="form-group">
          <label>4. Chon Dich vu & Phu tung su dung (Neu co)</label>
          <div style={{ display: 'flex', gap: '20px', marginTop: '8px'}}>

            {/* Cột Dịch Vụ */}
            <div style={{ flex: 1, border: '1px solid #ddd', padding: '10px', borderRadius: '4px'}}>
              <strong>Dich vu:</strong>
              {servicesList.map((s) => (
                <div key={s.id} style={{ marginTop: '5px'}}>
                  <label>
                    <input
                      type="checkbox"
                      value={s.id}
                      checked={selectedServices.includes(s.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedServices([...selectedServices, s.id]);
                        else setSelectedServices(selectedServices.filter((id) => id !== s.id));
                      }}
                    /> {s.name}
                  </label>
                </div>
              ))};
            </div>

            {/* Cột Phụ Tùng */}
            <div style={{ flex: 1, border: '1px solid #ddd', padding: '10px', borderRadius: '4px'}}>
              <strong>Phu tung:</strong>
              {partsList.map((p) => (
                <div key={p.id} style={{ marginTop: '5px'}}>
                  <label>
                    <input
                      type="checkbox"
                      value={p.id}
                      checked={selectedServices.includes(p.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedServices([...selectedServices, p.id]);
                        else setSelectedServices(selectedServices.filter((id) => id !== p.id));
                      }}
                    /> {p.name}
                  </label>
                </div>
              ))};
            </div>

          </div>
        </div>
        
        {/* Nút Submit */}
        <button className="btn btn-primary" disabled={loading} style={{ marginTop: '16px'}}>
          {loading ? 'Dang tao phieu...' : 'Tao phieu sua chua'}
        </button>
      </form>
    </div>
  );
}
