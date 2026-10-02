/**
 * TaskBoardPage — Bảng công việc của Thợ máy (Mechanic Task Board).
 * Hiển thị các phiếu được giao, cho phép cập nhật tiến độ và ghi nhận chẩn đoán.
 */
import { useEffect, useState } from 'react';
import api from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';

export default function TaskBoardPage() {
  const [jobs, setJobs] = useState([]);
  const [notice, setNotice] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    api.get('/repair-jobs/my-jobs').then((r) => setJobs(r.data.data));
  }, [reload]);

  async function changeStatus(jobId, status) {
    await api.put(`/repair-jobs/${jobId}/status`, { status });
    setNotice(`Phieu #${jobId} -> ${status}`);
    setReload((n) => n + 1);
  }

  async function saveDiagnosis(jobId) {
    const result = prompt('Ket qua chan doan:');
    if (!result) return;
    const suggestion = prompt('De xuat sua chua:') || '';
    await api.put(`/repair-jobs/${jobId}/diagnosis`, {
      diagnosisResult: result, repairSuggestion: suggestion,
    });
    setNotice(`Da luu chan doan cho phieu #${jobId}`);
  }

  return (
    <div>
      <div className="page-header"><h1>Bang cong viec cua toi</h1></div>
      {notice && <p style={{ color: 'var(--primary)', marginBottom: 12 }}>{notice}</p>}

      <div style={{ display: 'grid', gap: 16 }}>
        {jobs.map((j) => (
          <div key={j.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <strong>Phieu #{j.id} — {j.license_plate} ({j.brand} {j.model})</strong>
              <StatusBadge status={j.status} />
            </div>
            <p style={{ color: '#757575', marginBottom: 12 }}>{j.customer_request}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {j.status === 'diagnosing' && (
                <button className="btn btn-outline" onClick={() => saveDiagnosis(j.id)}>Ghi chan doan</button>
              )}
              {j.status === 'approved' && (
                <button className="btn btn-primary" onClick={() => changeStatus(j.id, 'in_repair')}>Bat dau sua</button>
              )}
              {j.status === 'in_repair' && (
                <button className="btn btn-success" onClick={() => changeStatus(j.id, 'completed')}>Hoan thanh</button>
              )}
            </div>
          </div>
        ))}
        {!jobs.length && <div className="card">Khong co cong viec nao duoc giao.</div>}
      </div>
    </div>
  );
}
