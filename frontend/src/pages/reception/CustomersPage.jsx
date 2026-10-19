/**
 * CustomersPage — Quản lý khách hàng (CRUD đơn giản).
 */
import { useEffect, useRef, useState } from 'react';
import api from '../../services/api';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({ fullName: '', phone: '', email: '' });
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [loadError, setLoadError] = useState('');
  const savingRef = useRef(false);

  useEffect(() => {
    let active = true;
    api.get('/customers')
      .then((r) => { if (active) setCustomers(r.data.data || []); })
      .catch((err) => { if (active) setLoadError(err.response?.data?.message || 'Không tải được khách hàng'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);

  function reloadCustomers() {
    setLoading(true);
    setLoadError('');
    setReload(n => n + 1);
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setNotice('');
    try {
      await api.post('/customers', { fullName: form.fullName.trim(), phone: form.phone.trim(), email: form.email.trim() || null });
      setForm({ fullName: '', phone: '', email: '' });
      setNotice('Đã thêm khách hàng thành công.');
      reloadCustomers();
    } catch (err) {
      setNotice(err.response?.data?.message || 'Không thể lưu khách hàng. Vui lòng thử lại.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-header"><h1>Quản lý khách hàng</h1></div>

      {notice && <p role="status">{notice}</p>}
      {loadError && <p role="alert">{loadError} <button onClick={reloadCustomers}>Thử lại</button></p>}
      {loading && <p role="status">Đang tải khách hàng...</p>}
      <form onSubmit={handleCreate} className="card" style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 160 }}>
          <label>Họ và tên (*)</label>
          <input disabled={saving} className="form-control" value={form.fullName} required
            onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        </div>
        <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 140 }}>
          <label>Số điện thoại (*)</label>
          <input disabled={saving} className="form-control" value={form.phone} required
            onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 160 }}>
          <label>Email</label>
          <input disabled={saving} className="form-control" type="email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <button className="btn btn-primary" disabled={saving || !form.fullName.trim() || !form.phone.trim()}>{saving ? 'Đang lưu...' : 'Thêm khách hàng'}</button>
      </form>

      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Mã KH</th><th>Họ và tên</th><th>Số điện thoại</th><th>Email</th></tr></thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}><td>#{c.id}</td><td>{c.full_name}</td><td>{c.phone}</td><td>{c.email || '—'}</td></tr>
              ))}
              {!loading && !loadError && !customers.length && <tr><td colSpan={4}>Chưa có khách hàng nào trong hệ thống</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
