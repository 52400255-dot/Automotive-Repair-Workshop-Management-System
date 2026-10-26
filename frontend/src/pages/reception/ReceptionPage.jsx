/**
 * ReceptionPage — Giao diện Lễ tân tiếp nhận xe (Vehicle Service Intake — US04).
 * Quy trình tiếp nhận và tạo phiếu được giữ nguyên; phần hiển thị hỗ trợ rà soát trước khi gửi.
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
  const [customerId, setCustomerId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [request, setRequest] = useState('');
  const [selectedServices, setSelectedServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    api.get('/customers')
      .then((r) => setCustomers(r.data.data || []))
      .catch((err) => setMessage({ text: 'Lỗi tải danh sách khách hàng: ' + (err.response?.data?.message || err.message), type: 'error' }));

    api.get('/services')
      .then((r) => setServicesList(r.data.data || []))
      .catch((err) => setMessage({ text: 'Lỗi tải danh mục dịch vụ: ' + (err.response?.data?.message || err.message), type: 'error' }));
  }, []);

  useEffect(() => {
    if (!customerId) return undefined;
    let cancelled = false;
    const version = customerVersion.current;
    const active = () => !cancelled && version === customerVersion.current;
    api.get('/customers/' + customerId + '/vehicles')
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
    if (selectedServices.some((id) => String(id) === String(serviceId))) {
      setSelectedServices(selectedServices.filter((id) => String(id) !== String(serviceId)));
    } else {
      setSelectedServices([...selectedServices, serviceId]);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting.current || vehiclesLoading || !vehicles.some((v) => String(v.id) === String(vehicleId)) || !request.trim()) return;
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
        text: 'Tạo phiếu sửa chữa thành công #' + (createdJob?.id || '') + '! Trạng thái: Chờ phân công kỹ thuật viên.',
        type: 'success',
      });
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

  const selectedCustomer = customers.find((customer) => String(customer.id) === String(customerId));
  const selectedVehicle = vehicles.find((vehicle) => String(vehicle.id) === String(vehicleId));
  const selectedServiceItems = servicesList.filter((service) => selectedServices.some((id) => String(id) === String(service.id)));
  const estimatedTotal = selectedServiceItems.reduce((sum, service) => sum + Number(service.standard_price || 0), 0);

  return (
    <div className="reception-page">
      <div className="page-header reception-heading">
        <div>
          <p className="eyebrow">QUY TRÌNH TIẾP NHẬN</p>
          <h1>Tiếp nhận xe mới</h1>
          <p>Ghi nhận thông tin khách hàng, phương tiện và yêu cầu sửa chữa ban đầu.</p>
        </div>
      </div>

      <div className="reception-stepper" aria-label="Các bước tiếp nhận">
        <div className={'reception-step' + (customerId ? ' is-complete' : ' is-active')}>
          <span>01</span><div><strong>Khách hàng</strong><small>{customerId ? 'Đã chọn thông tin' : 'Chọn khách hàng'}</small></div>
        </div>
        <i aria-hidden="true" />
        <div className={'reception-step' + (vehicleId ? ' is-complete' : customerId ? ' is-active' : '')}>
          <span>02</span><div><strong>Phương tiện</strong><small>{vehicleId ? 'Đã chọn phương tiện' : 'Chọn xe tiếp nhận'}</small></div>
        </div>
        <i aria-hidden="true" />
        <div className={'reception-step' + (request.trim() ? ' is-complete' : vehicleId ? ' is-active' : '')}>
          <span>03</span><div><strong>Yêu cầu sửa chữa</strong><small>{request.trim() ? 'Đã ghi nhận' : 'Mô tả tình trạng xe'}</small></div>
        </div>
        <i aria-hidden="true" />
        <div className={'reception-step' + (selectedServices.length ? ' is-complete' : '')}>
          <span>04</span><div><strong>Dịch vụ dự kiến</strong><small>Tùy chọn</small></div>
        </div>
      </div>

      {message.text && (
        <div className={'alert ' + (message.type === 'success' ? 'alert-success' : 'alert-error')} role="status">
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="reception-workspace">
        <section className="card reception-main-panel">
          <div className="reception-panel-heading">
            <div>
              <span className="panel-kicker">THÔNG TIN TIẾP NHẬN</span>
              <h2>Thông tin xe & yêu cầu</h2>
              <p>Các trường có dấu * cần được hoàn tất trước khi tạo phiếu.</p>
            </div>
            <span className="reception-required-mark">* Bắt buộc</span>
          </div>

          <div className="reception-field-grid">
            <div className="form-group reception-form-group">
              <label htmlFor="reception-customer"><span className="step-number">01</span><span className="step-label">Khách hàng <em>(bắt buộc)</em></span></label>
              <select id="reception-customer" className="form-control" disabled={loading} value={customerId} onChange={(e) => handleCustomerChange(e.target.value)} required>
                <option value="">-- Chọn khách hàng --</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.full_name} — SĐT: {c.phone} {c.email ? '(' + c.email + ')' : ''}</option>)}
              </select>
              {selectedCustomer && <small className="reception-field-note">SĐT: {selectedCustomer.phone || 'Chưa cập nhật'}{selectedCustomer.email ? ' · ' + selectedCustomer.email : ''}</small>}
            </div>

            <div className="form-group reception-form-group">
              <label htmlFor="reception-vehicle"><span className="step-number">02</span><span className="step-label">Phương tiện <em>(bắt buộc)</em></span></label>
              <select id="reception-vehicle" className="form-control" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} disabled={!customerId || vehiclesLoading || loading} required>
                <option value="">{vehiclesLoading ? 'Đang tải xe...' : !customerId ? '-- Vui lòng chọn khách hàng trước --' : '-- Chọn xe cần tiếp nhận --'}</option>
                {vehicles.map((v) => <option key={v.id} value={v.id}>{v.license_plate} — {v.brand} {v.model} ({v.manufacture_year || 'N/A'})</option>)}
              </select>
              {customerId && !vehiclesLoading && !vehiclesError && vehicles.length === 0 && <small className="form-hint form-hint-warning">Khách hàng này chưa có xe trong hệ thống.</small>}
              {selectedVehicle && <small className="reception-field-note">Biển số {selectedVehicle.license_plate} · {selectedVehicle.brand} {selectedVehicle.model}</small>}
            </div>
          </div>

          <div className="form-group reception-form-group reception-request-group">
            <label htmlFor="reception-request"><span className="step-number">03</span><span className="step-label">Triệu chứng hoặc yêu cầu của khách <em>(bắt buộc)</em></span></label>
            <textarea id="reception-request" className="form-control" rows={5} value={request} onChange={(e) => setRequest(e.target.value)} placeholder="Ví dụ: Xe khởi động khó, có tiếng kêu rít ở bánh trước khi rà phanh, đèn báo dầu nhấp nháy..." required />
            <small className="reception-field-note">Mô tả càng cụ thể càng giúp kỹ thuật viên kiểm tra chính xác hơn.</small>
          </div>

          <div className="form-group reception-form-group reception-services-group">
            <div className="reception-services-heading">
              <label><span className="step-number">04</span><span className="step-label">Dịch vụ dự kiến <em>(không bắt buộc)</em></span></label>
              <span className="service-count">{selectedServiceItems.length} đã chọn</span>
            </div>
            <div className="service-picker reception-service-picker">
              {servicesList.length === 0 ? <span className="empty-note">Chưa có dịch vụ trong danh mục.</span> : servicesList.map((s) => (
                <div key={s.id} className={'service-option reception-service-option' + (selectedServices.some((id) => String(id) === String(s.id)) ? ' is-selected' : '')}>
                  <label>
                    <input type="checkbox" value={s.id} checked={selectedServices.some((id) => String(id) === String(s.id))} onChange={() => toggleService(s.id)} />
                    <span><strong>{s.service_name}</strong>{s.description && <small>{s.description}</small>}</span>
                  </label>
                  <span className="service-price">{Number(s.standard_price).toLocaleString('vi-VN')} đ</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="card reception-summary">
          <div className="reception-summary-heading">
            <span className="summary-mark" aria-hidden="true">✦</span>
            <div><span className="panel-kicker">KIỂM TRA PHIẾU</span><h2>Tóm tắt tiếp nhận</h2></div>
          </div>
          <div className="reception-summary-section">
            <span className="summary-label">KHÁCH HÀNG</span>
            <strong>{selectedCustomer?.full_name || 'Chưa chọn khách hàng'}</strong>
            <small>{selectedCustomer?.phone || 'Thông tin sẽ hiển thị tại đây'}</small>
          </div>
          <div className="reception-summary-section">
            <span className="summary-label">PHƯƠNG TIỆN</span>
            <strong>{selectedVehicle ? selectedVehicle.license_plate : 'Chưa chọn phương tiện'}</strong>
            <small>{selectedVehicle ? [selectedVehicle.brand, selectedVehicle.model].filter(Boolean).join(' ') : 'Biển số xe sẽ hiển thị tại đây'}</small>
          </div>
          <div className="reception-summary-section">
            <span className="summary-label">YÊU CẦU BAN ĐẦU</span>
            <p className="summary-request">{request.trim() || 'Nội dung yêu cầu sẽ hiển thị tại đây.'}</p>
          </div>
          <div className="reception-summary-services">
            <div className="summary-service-title"><span>Dịch vụ dự kiến</span><strong>{selectedServiceItems.length}</strong></div>
            {selectedServiceItems.length ? selectedServiceItems.map((service) => (
              <div className="summary-service-line" key={service.id}><span>{service.service_name}</span><strong>{Number(service.standard_price).toLocaleString('vi-VN')} đ</strong></div>
            )) : <p>Chưa chọn dịch vụ.</p>}
          </div>
          <div className="reception-estimate-total"><span>Tạm tính dịch vụ</span><strong>{estimatedTotal.toLocaleString('vi-VN')} đ</strong></div>
          <p className="reception-summary-note">Chi phí thực tế sẽ được xác nhận sau khi kỹ thuật viên kiểm tra xe.</p>
          <button type="submit" className="btn btn-primary reception-submit" disabled={loading || vehiclesLoading || !customerId || !vehicles.some((v) => String(v.id) === String(vehicleId)) || !request.trim()}>
            {loading ? 'Đang tạo phiếu...' : 'Tiếp nhận xe & Tạo phiếu'}
          </button>
          <span className="reception-secure-note">Thông tin được lưu vào hồ sơ sửa chữa của khách.</span>
        </aside>
      </form>
    </div>
  );
}
