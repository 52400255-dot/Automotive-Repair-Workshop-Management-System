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
      <div className="page-header"><h1>Khach hang</h1></div>

      <form onSubmit={handleCreate} className="card" style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 160 }}>
          <label>Ho ten</label>
          <input className="form-control" value={form.fullName} required
            onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        </div>
        <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 140 }}>
          <label>So dien thoai</label>
          <input className="form-control" value={form.phone} required
            onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 160 }}>
          <label>Email</label>
          <input className="form-control" type="email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <button className="btn btn-primary">Them khach hang</button>
      </form>

      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Ma</th><th>Ho ten</th><th>Dien thoai</th><th>Email</th></tr></thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}><td>#{c.id}</td><td>{c.full_name}</td><td>{c.phone}</td><td>{c.email}</td></tr>
              ))}
              {!customers.length && <tr><td colSpan={4}>Chua co khach hang</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
