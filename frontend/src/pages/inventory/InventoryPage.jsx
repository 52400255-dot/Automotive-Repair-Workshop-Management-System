/**
 * InventoryPage — Quản lý kho phụ tùng: danh sách, cảnh báo tồn kho thấp, nhập hàng.
 */
import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function InventoryPage() {
  const [parts, setParts] = useState([]);
  const [notice, setNotice] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    api.get('/spare-parts').then((r) => setParts(r.data.data));
  }, [reload]);

  async function handleImport(partId) {
    const qty = prompt('So luong nhap kho:');
    if (!qty || Number(qty) <= 0) return;
    try {
      await api.post(`/spare-parts/${partId}/import`, { quantity: Number(qty) });
      setNotice(`Da nhap ${qty} cho phu tung #${partId}`);
      setReload((n) => n + 1);
    } catch (err) {
      setNotice(err.response?.data?.message || 'Loi nhap kho');
    }
  }

  const isLow = (p) => Number(p.stock_quantity) <= Number(p.min_stock);

  return (
    <div>
      <div className="page-header"><h1>Kho phu tung</h1></div>
      {notice && <p style={{ color: 'var(--primary)', marginBottom: 12 }}>{notice}</p>}
      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr><th>Ma hang</th><th>Ten phu tung</th><th>Don vi</th><th>Ton kho</th><th>Don gia</th><th></th></tr>
            </thead>
            <tbody>
              {parts.map((p) => (
                <tr key={p.id} style={isLow(p) ? { background: '#fff3e0' } : undefined}>
                  <td>{p.part_code}</td>
                  <td>{p.part_name}{isLow(p) && <span className="badge badge-pending" style={{ marginLeft: 8 }}>Sap het</span>}</td>
                  <td>{p.unit}</td>
                  <td>{p.stock_quantity}</td>
                  <td>{Number(p.unit_price).toLocaleString('vi-VN')} đ</td>
                  <td><button className="btn btn-outline" onClick={() => handleImport(p.id)}>Nhap kho</button></td>
                </tr>
              ))}
              {!parts.length && <tr><td colSpan={6}>Kho trong</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
