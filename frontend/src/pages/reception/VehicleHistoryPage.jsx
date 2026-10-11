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
      .catch((err) => setNotice(err.response?.data?.message || 'Loi tai danh sach xe'));
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
      setNotice(err.response?.data?.message || 'Loi tai lich su sua chua');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Lich su sua chua xe</h1>
      </div>

      {notice && (
        <p style={{ color: 'var(--error)', marginBottom: 12, fontWeight: 'bold' }}>{notice}</p>
      )}

      {/* B1: Tìm kiếm / chọn phương tiện */}
      <form
        className="card"
        style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}
        onSubmit={(e) => {
          e.preventDefault();
          setSearched(true);
          setSelected(null);
          setHistory([]);
          setNotice('');
        }}
      >
        <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 260 }}>
          <label>Tim xe theo bien so, hang xe, dong xe hoac ten khach hang</label>
          <input
            className="form-control"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Vi du: 51A-12345, Toyota, Nguyen Van An..."
            aria-label="Từ khóa tìm xe"
          />
        </div>
        <button className="btn btn-primary" type="submit">Tim xe</button>
      </form>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Bien so</th><th>Hang / Dong xe</th><th>Khach hang</th>
                <th>So phieu sua</th><th>Lan cuoi</th><th></th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id}>
                  <td>{v.license_plate}</td>
                  <td>{v.brand} {v.model}</td>
                  <td>{v.customer_name}</td>
                  <td>{Number(v.job_count || 0)}</td>
                  <td>{v.last_received_at ? new Date(v.last_received_at).toLocaleString('vi-VN') : '—'}</td>
                  <td>
                    <button className="btn btn-outline" onClick={() => handleSelect(v)}>
                      Xem lich su
                    </button>
                  </td>
                </tr>
              ))}
              {!vehicles.length && (
                <tr>
                  <td colSpan={6}>
                    {searched ? 'Khong tim thay xe nao khop tu khoa' : 'Chua co xe trong he thong'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* B2: Lịch sử sửa chữa của xe đã chọn */}
      {selected && (
        <div className="card">
          <strong>
            {selected.license_plate} — {selected.brand} {selected.model} ({selected.manufacture_year || '—'})
            &nbsp;·&nbsp; {selected.customer_name}
          </strong>

          {loading && <p style={{ marginTop: 8 }}>Dang tai lich su...</p>}

          <div className="table-wrapper" style={{ marginTop: 8 }}>
            <table>
              <thead>
                <tr>
                  <th>Ma phieu</th><th>Trang thai</th><th>Yeu cau khach hang</th>
                  <th>Dich vu</th><th>Phu tung</th><th>Tho may</th>
                  <th>Tiep nhan</th><th>Hoan thanh</th><th>Chi phi</th>
                </tr>
              </thead>
              <tbody>
                {history.map((j) => (
                  <tr key={j.id}>
                    <td>#{j.id}</td>
                    <td><StatusBadge status={j.status} /></td>
                    <td style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
                  <tr><td colSpan={9}>Xe nay chua co lich su sua chua</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
