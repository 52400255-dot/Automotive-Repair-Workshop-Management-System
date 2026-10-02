/**
 * DashboardPage — Trang tổng quan sau đăng nhập (staff roles).
 */
import { useEffect, useState } from 'react';
import api from '../services/api';
import StatusBadge from '../components/common/StatusBadge';

export default function DashboardPage() {
  const [jobs, setJobs] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/repair-jobs').then((r) => setJobs(r.data.data)).catch((e) => setError(e.message));
    api.get('/spare-parts/low-stock').then((r) => setLowStock(r.data.data)).catch(() => {});
  }, []);

  const active = jobs.filter((j) => !['completed', 'cancelled'].includes(j.status));

  return (
    <div>
      <div className="page-header"><h1>Dashboard</h1></div>
      {error && <p style={{ color: 'var(--error)' }}>{error}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card"><small style={{ color: '#757575' }}>Phieu dang hoat dong</small><div style={{ fontSize: 28, fontWeight: 700 }}>{active.length}</div></div>
        <div className="card"><small style={{ color: '#757575' }}>Da hoan thanh</small><div style={{ fontSize: 28, fontWeight: 700 }}>{jobs.filter((j) => j.status === 'completed').length}</div></div>
        <div className="card"><small style={{ color: '#757575' }}>Phu tung thap kho</small><div style={{ fontSize: 28, fontWeight: 700, color: lowStock.length ? 'var(--warning)' : undefined }}>{lowStock.length}</div></div>
      </div>

      <div className="card">
        <h2 style={{ fontSize: 16, marginBottom: 12 }}>Phieu sua chua gan day</h2>
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Ma</th><th>Bien so</th><th>Khach hang</th><th>Trang thai</th><th>Tiep nhan</th></tr></thead>
            <tbody>
              {jobs.slice(0, 8).map((j) => (
                <tr key={j.id}>
                  <td>#{j.id}</td><td>{j.license_plate}</td><td>{j.customer_name}</td>
                  <td><StatusBadge status={j.status} /></td>
                  <td>{new Date(j.received_at).toLocaleString('vi-VN')}</td>
                </tr>
              ))}
              {!jobs.length && !error && <tr><td colSpan={5}>Chua co phieu sua chua</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
