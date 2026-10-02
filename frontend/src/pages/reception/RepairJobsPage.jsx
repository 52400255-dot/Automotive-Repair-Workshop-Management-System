/**
 * RepairJobsPage — Danh sách phiếu sửa chữa + hành động phân công thợ.
 */
import { useEffect, useState } from 'react';
import api from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';

export default function RepairJobsPage() {
  const [jobs, setJobs] = useState([]);
  const [notice, setNotice] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    api.get('/repair-jobs').then((r) => setJobs(r.data.data));
  }, [reload]);

  async function assignMechanic(jobId) {
    const mechanicId = prompt('Nhap ID tho may can phan cong:');
    if (!mechanicId) return;
    try {
      await api.put(`/repair-jobs/${jobId}/assign`, { mechanicId: Number(mechanicId) });
      setNotice(`Da phan cong tho ${mechanicId} cho phieu #${jobId}`);
      setReload((n) => n + 1);
    } catch (err) {
      setNotice(err.response?.data?.message || 'Loi phan cong');
    }
  }

  return (
    <div>
      <div className="page-header"><h1>Phieu sua chua</h1></div>
      {notice && <p style={{ color: 'var(--primary)', marginBottom: 12 }}>{notice}</p>}
      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr><th>Ma</th><th>Bien so</th><th>Khach hang</th><th>Yeu cau</th><th>Trang thai</th><th></th></tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id}>
                  <td>#{j.id}</td>
                  <td>{j.license_plate}</td>
                  <td>{j.customer_name}</td>
                  <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.customer_request}</td>
                  <td><StatusBadge status={j.status} /></td>
                  <td>
                    {j.status === 'pending' && (
                      <button className="btn btn-outline" onClick={() => assignMechanic(j.id)}>Phan cong tho</button>
                    )}
                  </td>
                </tr>
              ))}
              {!jobs.length && <tr><td colSpan={6}>Chua co phieu nao</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
