/**
 * CustomersPage — Quản lý khách hàng (CRUD đơn giản).
 */
import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({ fullName: '', phone: '', email: '' });
  const [reload, setReload] = useState(0);

  useEffect(() => {
    api.get('/customers').then((r) => setCustomers(r.data.data));
  }, [reload]);

  async function handleCreate(e) {
    e.preventDefault();
    await api.post('/customers', {
      fullName: form.fullName, phone: form.phone, email: form.email || null,
    });
    setForm({ fullName: '', phone: '', email: '' });
    setReload((n) => n + 1);
  }

  return (
    <div>
      <div className="page-header"><h1>Quản lý khách hàng</h1></div>

      <form onSubmit={handleCreate} className="card" style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 160 }}>
          <label>Họ và tên (*)</label>
          <input className="form-control" value={form.fullName} required
            onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        </div>
        <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 140 }}>
          <label>Số điện thoại (*)</label>
          <input className="form-control" value={form.phone} required
            onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 160 }}>
          <label>Email</label>
          <input className="form-control" type="email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <button className="btn btn-primary">Thêm khách hàng</button>
      </form>

      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Mã KH</th><th>Họ và tên</th><th>Số điện thoại</th><th>Email</th></tr></thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}><td>#{c.id}</td><td>{c.full_name}</td><td>{c.phone}</td><td>{c.email || '—'}</td></tr>
              ))}
              {!customers.length && <tr><td colSpan={4}>Chưa có khách hàng nào trong hệ thống</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
