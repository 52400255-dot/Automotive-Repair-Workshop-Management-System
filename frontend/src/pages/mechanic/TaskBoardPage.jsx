/**
 * TaskBoardPage — Bảng công việc của Kỹ thuật viên / Thợ máy (US08 & US06).
 * Cho phép:
 *   - Xem danh sách phiếu sửa chữa được phân công cho chính thợ đăng nhập (US08).
 *   - Nhập / Cập nhật kết quả chẩn đoán kỹ thuật & đề xuất sửa chữa qua Modal (US06).
 *   - Cập nhật tiến độ sửa chữa: Bắt đầu sửa (in_repair) -> Hoàn thành (completed).
 */
import { useEffect, useState } from 'react';
import api from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';

export default function TaskBoardPage() {
  const [jobs, setJobs] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [notice, setNotice] = useState({ text: '', type: '' });
  const [reload, setReload] = useState(0);

  // State cho Modal Ghi Chẩn đoán (US06)
  const [diagnosisModal, setDiagnosisModal] = useState({ open: false, job: null });
  const [diagnosisResult, setDiagnosisResult] = useState('');
  const [repairSuggestion, setRepairSuggestion] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const url = statusFilter ? `/repair-jobs/my-jobs?status=${statusFilter}` : '/repair-jobs/my-jobs';
    api.get(url)
      .then((r) => setJobs(r.data.data || []))
      .catch((err) => setNotice({ text: err.response?.data?.message || 'Lỗi tải danh sách công việc', type: 'error' }));
  }, [reload, statusFilter]);

  async function changeStatus(jobId, status) {
    try {
      await api.put(`/repair-jobs/${jobId}/status`, { status });
      const statusLabel = status === 'completed' ? 'Hoàn thành sửa chữa' : (status === 'in_repair' ? 'Đang sửa chữa' : status);
      setNotice({ text: `✓ Phiếu #${jobId} đã cập nhật trạng thái: [${statusLabel}] thành công!`, type: 'success' });
      setReload((n) => n + 1);
    } catch (err) {
      setNotice({ text: err.response?.data?.message || 'Lỗi cập nhật trạng thái', type: 'error' });
    }
  }

  function openDiagnosis(job) {
    setDiagnosisModal({ open: true, job });
    setDiagnosisResult(job.diagnosis_result || '');
    setRepairSuggestion(job.repair_suggestion || '');
  }

  function closeDiagnosis() {
    setDiagnosisModal({ open: false, job: null });
    setDiagnosisResult('');
    setRepairSuggestion('');
  }

  async function handleDiagnosisSubmit(e) {
    e.preventDefault();
    if (!diagnosisResult.trim()) return;

    setSubmitting(true);
    try {
      await api.put(`/repair-jobs/${diagnosisModal.job.id}/diagnosis`, {
        diagnosisResult,
        repairSuggestion,
      });
      setNotice({
        text: `Đã lưu kết quả chẩn đoán cho phiếu #${diagnosisModal.job.id}!`,
        type: 'success',
      });
      closeDiagnosis();
      setReload((n) => n + 1);
    } catch (err) {
      setNotice({
        text: err.response?.data?.message || 'Lỗi khi lưu chẩn đoán',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Bảng công việc của kỹ thuật viên (US08 & US06)</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            className="form-control"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: 190 }}
          >
            <option value="">Tất cả công việc</option>
            <option value="in_repair">Đang sửa chữa (in_repair)</option>
            <option value="diagnosing">Đang chẩn đoán (diagnosing)</option>
            <option value="approved">Đã duyệt (approved)</option>
            <option value="completed">Đã hoàn thành (completed)</option>
          </select>
        </div>
      </div>

      {notice.text && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '6px',
            marginBottom: 16,
            fontWeight: 600,
            backgroundColor: notice.type === 'success' ? '#f6ffed' : '#fff2f0',
            border: `1px solid ${notice.type === 'success' ? '#b7eb8f' : '#ffccc7'}`,
            color: notice.type === 'success' ? '#389e0d' : '#cf1322',
          }}
        >
          {notice.text}
        </div>
      )}

      <div style={{ display: 'grid', gap: 16 }}>
        {jobs.map((j) => (
          <div key={j.id} className="card" style={{ borderLeft: `4px solid ${j.status === 'completed' ? '#52c41a' : '#1976d2'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <span style={{ fontSize: '18px', fontWeight: 700, color: j.status === 'completed' ? '#389e0d' : '#1976d2' }}>
                  Phiếu #{j.id}
                </span>
                <span style={{ marginLeft: 12, fontSize: '16px', fontWeight: 600 }}>
                  {j.license_plate} ({j.brand} {j.model})
                </span>
                <div style={{ fontSize: '13px', color: '#666', marginTop: 2 }}>
                  Khách hàng: <strong>{j.customer_name}</strong> {j.customer_phone ? `— ${j.customer_phone}` : ''}
                </div>
              </div>
              <StatusBadge status={j.status} />
            </div>

            <div style={{ background: '#fafafa', padding: '10px 14px', borderRadius: '6px', marginBottom: 12, fontSize: '14px' }}>
              <strong>Yêu cầu từ khách:</strong> {j.customer_request || 'Không có mô tả'}
            </div>

            {/* Hiển thị chẩn đoán nếu đã ghi nhận */}
            {j.diagnosis_result && (
              <div style={{ background: '#e6f7ff', border: '1px solid #91d5ff', padding: '10px 14px', borderRadius: '6px', marginBottom: 12, fontSize: '13px' }}>
                <div style={{ fontWeight: 600, color: '#0050b3', marginBottom: 4 }}>
                  Chẩn đoán hiện tại (lúc {new Date(j.diagnosed_at).toLocaleString('vi-VN')}):
                </div>
                <div><strong>Kết quả:</strong> {j.diagnosis_result}</div>
                {j.repair_suggestion && <div><strong>Đề xuất:</strong> {j.repair_suggestion}</div>}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Thợ có thể cập nhật chẩn đoán khi đang diagnosing hoặc bất kỳ lúc nào cần bổ sung */}
              <button
                className="btn btn-outline"
                disabled={j.status !== 'diagnosing' || submitting}
                onClick={() => openDiagnosis(j)}
                style={{ fontSize: '13px' }}
              >
                {j.diagnosis_result ? 'Cập nhật lại chẩn đoán' : 'Ghi kết quả chẩn đoán (US06)'}
              </button>

              {j.status === 'approved' && (
                <button
                  className="btn btn-primary"
                  onClick={() => changeStatus(j.id, 'in_repair')}
                  style={{ fontSize: '13px' }}
                >
                  Bắt đầu sửa chữa
                </button>
              )}

              {j.status === 'in_repair' && (
                <button
                  className="btn btn-success"
                  onClick={() => changeStatus(j.id, 'completed')}
                  style={{ fontSize: '13px', backgroundColor: '#52c41a', color: '#fff' }}
                >
                  Hoàn thành sửa chữa
                </button>
              )}

              {j.status === 'completed' && (
                <div style={{ color: '#389e0d', background: '#f6ffed', border: '1px solid #b7eb8f', padding: '6px 12px', borderRadius: '4px', fontSize: '13px', fontWeight: 600 }}>
                  ✓ Đã hoàn thành sửa chữa lúc {j.completed_at ? new Date(j.completed_at).toLocaleString('vi-VN') : 'vừa xong'}
                </div>
              )}
            </div>
          </div>
        ))}

        {!jobs.length && (
          <div className="card" style={{ textAlign: 'center', padding: '36px', color: '#888' }}>
            <h3>Hiện tại không có công việc sửa chữa nào khớp bộ lọc.</h3>
            <p style={{ margin: 0 }}>Vui lòng kiểm tra lại sau hoặc liên hệ Quản lý dịch vụ.</p>
          </div>
        )}
      </div>

      {/* Modal Nhập kết quả Chẩn đoán (US06) */}
      {diagnosisModal.open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '8px',
              padding: '24px',
              width: '540px',
              maxWidth: '90%',
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: 12, color: '#1976d2' }}>
              Ghi nhận chẩn đoán kỹ thuật — Phiếu #{diagnosisModal.job?.id}
            </h3>

            <div style={{ background: '#f5f5f5', padding: '10px 12px', borderRadius: '6px', marginBottom: 16, fontSize: '13px' }}>
              <strong>Phương tiện:</strong> {diagnosisModal.job?.license_plate} ({diagnosisModal.job?.brand} {diagnosisModal.job?.model})<br />
              <strong>Yêu cầu của khách:</strong> {diagnosisModal.job?.customer_request}
            </div>

            <form onSubmit={handleDiagnosisSubmit}>
              <div className="form-group">
                <label style={{ fontWeight: 600 }}>Kết quả kiểm tra / chẩn đoán (*)</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={diagnosisResult}
                  onChange={(e) => setDiagnosisResult(e.target.value)}
                  placeholder="Ví dụ: Má phanh trước bên phụ mòn dưới 2mm, đĩa phanh xước nhẹ, dầu phanh biến chất..."
                  required
                />
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 600 }}>Đề xuất phương án sửa chữa & phụ tùng thay thế</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={repairSuggestion}
                  onChange={(e) => setRepairSuggestion(e.target.value)}
                  placeholder="Ví dụ: Thay bộ má phanh trước (BRAKE-PAD-001), láng đĩa phanh, thay dầu phanh DOT4..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" className="btn btn-outline" onClick={closeDiagnosis} disabled={submitting}>
                  Đóng
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting || !diagnosisResult.trim()}>
                  {submitting ? 'Đang lưu...' : 'Lưu chẩn đoán'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
