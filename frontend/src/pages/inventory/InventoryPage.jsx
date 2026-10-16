/**
 * InventoryPage — Quản lý kho phụ tùng: danh sách, cảnh báo tồn kho thấp, nhập hàng.
 */
import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function InventoryPage() {
  const [parts, setParts] = useState([]);
  const [notice, setNotice] = useState('');
  const [reload, setReload] = useState(0);

  // Form State cho việc Ghi nhận phụ tùng vào Phiếu Sửa Chữa (US10 & US11)
  const [usageForm, setUsageForm] = useState({
    repairJobId: '',
    partId: '',
    quantity: 1
  });

  useEffect(() => {
    api.get('/spare-parts')
    .then((r) => setParts(r.data.data || r.data))
    .catch(() => {
      // Mock data nếu Backend chưa trả về API
        setParts([
          { id: 1, part_code: 'PT01', part_name: 'Nhớt Castrol 4L', unit: 'Can', stock_quantity: 15, min_stock: 5, unit_price: 450000 },
          { id: 2, part_code: 'PT02', part_name: 'Má phanh Toyota', unit: 'Bộ', stock_quantity: 2, min_stock: 5, unit_price: 650000 }
        ]);
    });
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

  // Xử lý ghi nhận phụ tùng đã sử dụng vào Phiếu sửa chữa (US10, US11)
  async function handleRecordUsage(e) {
    e.preventDefault();
    if (!usageForm.repairJobId || !usageForm.partId || usageForm.quantity <= 0) {
      alert('Vui long nhap day du thong tin Phieu sua chua va So luong!');
      return;
    }

    try {
      await api.post(`/repair-jobs/${usageForm.repairJobId}/parts`, {
        part_id: usageForm.partId,
        quantity: Number(usageForm.quantity)
      });
      setNotice(`Da ghi nhan phu tung cho Phieu #${usageForm.repairJobId} thanh cong!`);
      setUsageForm({ repairJobId: '', partId: '', quantity: 1 });
      setReload((n) => n + 1);
    } catch (err) {
      setNotice(err.response?.data?.message || 'Loi ghi nhan phu tung');
    }
  }

  const isLow = (p) => Number(p.stock_quantity) <= Number(p.min_stock);
  const lowStockParts = parts.filter(isLow);

  return (
    <div style={{ padding: '20px' }}>
      <div className="page-header">
        <h1>Kho phu tung & Vat tu</h1>
      </div>

      {notice && <p style={{ color: 'var(--primary)', marginBottom: 12, fontWeight: 'bold' }}>{notice}</p>}

      {/* 1. Khu vực Thẻ Cảnh Báo Tồn Kho Thấp (US12) */}
      {lowStockParts.length > 0 && (
        <div style={{ marginBottom: 20, padding: 15, background: '#fff2f0', border: '1px solid #ff4d4f', borderRadius: 8 }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#cf1322' }}>⚠️ Canh bao phu tung sap het kho ({lowStockParts.length})</h3>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {lowStockParts.map((p) => (
              <span key={p.id} className="badge badge-pending" style={{ padding: '6px 12px', background: '#ff4d4f', color: '#fff' }}>
                {p.part_name} (Con: {p.stock_quantity} {p.unit})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 2. Form Ghi Nhận Phụ Tùng Sử Dụng Cho Phiếu Sửa Chữa (US10 & US11) */}
      <div className="card" style={{ marginBottom: 20, padding: 15 }}>
        <h3>Ghi nhan phu tung su dung cho Phieu sua chua</h3>
        <form onSubmit={handleRecordUsage} style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10 }}>
          <input
            className="form-control"
            placeholder="Ma phieu sua chua (VD: 101)"
            value={usageForm.repairJobId}
            onChange={(e) => setUsageForm({ ...usageForm, repairJobId: e.target.value })}
            required
          />
          <select
            className="form-control"
            value={usageForm.partId}
            onChange={(e) => setUsageForm({ ...usageForm, partId: e.target.value })}
            required
          >
            <option value="">-- Chon phu tung --</option>
            {parts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.part_name} (Ton: {p.stock_quantity})
              </option>
            ))}
          </select>
          <input
            type="number"
            min="1"
            className="form-control"
            style={{ width: 100 }}
            value={usageForm.quantity}
            onChange={(e) => setUsageForm({ ...usageForm, quantity: e.target.value })}
            required
          />
          <button type="submit" className="btn btn-primary">Ghi nhan su dung</button>
        </form>
      </div>

      {/* 3. Bảng Danh Sách Kho Phụ Tùng */}
      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Ma hang</th>
                <th>Ten phu tung</th>
                <th>Don vi</th>
                <th>Ton kho</th>
                <th>Don gia</th>
                <th>Thao tac</th>
              </tr>
            </thead>
            <tbody>
              {parts.map((p) => (
                <tr key={p.id} style={isLow(p) ? { background: '#fff3e0' } : undefined}>
                  <td>{p.part_code}</td>
                  <td>
                    {p.part_name}
                    {isLow(p) && <span className="badge badge-pending" style={{ marginLeft: 8 }}>Sap het</span>}
                  </td>
                  <td>{p.unit}</td>
                  <td>{p.stock_quantity}</td>
                  <td>{Number(p.unit_price).toLocaleString('vi-VN')} đ</td>
                  <td>
                    <button className="btn btn-outline" onClick={() => handleImport(p.id)}>Nhap kho</button>
                  </td>
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
