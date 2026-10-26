/**
 * VehicleHistoryPage — Lễ tân tra cứu lịch sử sửa chữa của một xe (US03).
 *
 * Luồng: tìm xe (biển số / hãng xe / tên khách hàng) → chọn xe → xem các phiếu
 * sửa chữa của đúng xe đó, kèm dịch vụ, phụ tùng, thợ máy và chi phí.
 */
import { useEffect, useState } from 'react';
import api from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';

/** Định dạng số tiền VND gọn để hiển thị (NULL/0 → dấu gạch) */
function money(value) {
  const n = Number(value || 0);
  return n > 0 ? n.toLocaleString('vi-VN') + ' đ' : '—';
}

/** Ghép mảng [{name, quantity}] thành chuỗi đọc nhanh */
function joinItems(list, unit = '') {
  if (!list?.length) return '—';
  return list.map((x) => `${x.name}${unit ? ' x' + x.quantity : ''}`).join(', ');
}

export default function VehicleHistoryPage() {
  const [keyword, setKeyword] = useState('');
  const [vehicles, setVehicles] = useState([]);
  const [searched, setSearched] = useState(false);

  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  /** Tải danh sách xe; có từ khóa thì lọc phía server */
  useEffect(() => {
    api
      .get('/vehicles', { params: keyword ? { search: keyword } : {} })
      .then((r) => setVehicles(r.data.data))
      .catch((err) => setNotice(err.response?.data?.message || 'Lỗi tải danh sách xe'));
  }, [keyword]);

  /** Chọn một xe → gọi lịch sử sửa chữa của đúng xe đó */
  async function handleSelect(vehicle) {
    setSelected(vehicle);
    setHistory([]);
    setNotice('');
    setLoading(true);
    try {
      const r = await api.get(`/vehicles/${vehicle.id}/repair-history`);
      setHistory(r.data.data);
    } catch (err) {
      setNotice(err.response?.data?.message || 'Lỗi tải lịch sử sửa chữa');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="vehicle-history-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Hồ sơ phương tiện</p>
          <h1>Lịch sử sửa chữa</h1>
          <p>Tra cứu các lần tiếp nhận, hạng mục đã làm và chi phí theo từng xe.</p>
        </div>
      </div>

      {notice && (
        <div className="alert alert-error" role="alert">{notice}</div>
      )}

      {/* B1: Tìm kiếm / chọn phương tiện */}
      <form
        className="card history-search"
        onSubmit={(e) => {
          e.preventDefault();
          setSearched(true);
          setSelected(null);
          setHistory([]);
          setNotice('');
        }}
      >
        <div className="form-group history-search-field">
          <label htmlFor="vehicle-history-search">Tìm theo biển số, hãng xe hoặc khách hàng</label>
          <input
            id="vehicle-history-search"
            className="form-control"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Ví dụ: 51A-12345, Toyota, Nguyễn Văn An..."
            aria-label="Từ khóa tìm xe"
          />
        </div>
        <button className="btn btn-primary history-search-button" type="submit">Tìm xe</button>
      </form>

      <div className="card table-card history-results-card">
        <div className="table-card-heading">
          <div>
            <h2>Phương tiện</h2>
            <p>Chọn xe để xem đầy đủ lịch sử sửa chữa.</p>
          </div>
          <span className="record-count">{vehicles.length} xe</span>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Biển số xe</th><th>Hãng / Dòng xe</th><th>Khách hàng</th>
                <th>Số phiếu sửa</th><th>Lần cuối tiếp nhận</th><th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id}>
                  <td><strong>{v.license_plate}</strong></td>
                  <td>{v.brand} {v.model}</td>
                  <td>{v.customer_name}</td>
                  <td>{Number(v.job_count || 0)}</td>
                  <td>{v.last_received_at ? new Date(v.last_received_at).toLocaleString('vi-VN') : '—'}</td>
                  <td>
                    <button className="btn btn-outline" onClick={() => handleSelect(v)}>
                      Xem lịch sử
                    </button>
                  </td>
                </tr>
              ))}
              {!vehicles.length && (
                <tr>
                  <td colSpan={6}>
                    {searched ? 'Không tìm thấy xe nào khớp từ khóa' : 'Chưa có xe trong hệ thống'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* B2: Lịch sử sửa chữa của xe đã chọn */}
      {selected && (
        <div className="card selected-vehicle-history">
          <div className="table-card-heading">
            <div>
              <p className="eyebrow">Lịch sử phương tiện</p>
              <h2>{selected.license_plate}</h2>
              <p>{selected.brand} {selected.model} · {selected.manufacture_year || '—'} · {selected.customer_name}</p>
            </div>
            <span className="record-count">{history.length} phiếu</span>
          </div>

          {loading && <p className="loading-note" role="status">Đang tải lịch sử sửa chữa...</p>}

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Mã phiếu</th><th>Trạng thái</th><th>Yêu cầu của khách</th>
                  <th>Dịch vụ</th><th>Phụ tùng</th><th>Thợ máy</th>
                  <th>Tiếp nhận</th><th>Hoàn thành</th><th>Chi phí</th>
                </tr>
              </thead>
              <tbody>
                {history.map((j) => (
                  <tr key={j.id}>
                    <td><strong>#{j.id}</strong></td>
                    <td><StatusBadge status={j.status} /></td>
                    <td className="job-request-cell">
                      {j.customer_request || '—'}
                    </td>
                    <td>{joinItems(j.services)}</td>
                    <td>{joinItems(j.parts, true)}</td>
                    <td>{j.mechanics?.length ? j.mechanics.join(', ') : '—'}</td>
                    <td>{new Date(j.received_at).toLocaleString('vi-VN')}</td>
                    <td>{j.completed_at ? new Date(j.completed_at).toLocaleString('vi-VN') : '—'}</td>
                    <td>
                      {money(Number(j.invoice_total || 0)
                        || Number(j.labor_total || 0) + Number(j.parts_total || 0))}
                    </td>
                  </tr>
                ))}
                {!loading && !history.length && (
                  <tr><td colSpan={9}>Xe này chưa có lịch sử sửa chữa</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
