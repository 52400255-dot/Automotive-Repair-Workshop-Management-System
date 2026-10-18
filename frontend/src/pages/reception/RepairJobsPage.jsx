/**
 * RepairJobsPage — Quản lý danh sách phiếu sửa chữa & Phân công kỹ thuật viên (US07).
 * Cho phép lọc theo trạng thái, mở modal phân công thợ máy từ danh sách thực tế.
 */
import { useEffect, useState } from 'react';
import api from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';

export default function RepairJobsPage() {
  const [jobs, setJobs] = useState([]);
  const [mechanics, setMechanics] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [notice, setNotice] = useState({ text: '', type: '' });
  const [reload, setReload] = useState(0);

  // State cho Modal Phân công
  const [assignModal, setAssignModal] = useState({ open: false, job: null });
  const [selectedMechanicId, setSelectedMechanicId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Tải danh sách phiếu sửa chữa
  useEffect(() => {
    const url = statusFilter ? `/repair-jobs?status=${statusFilter}` : '/repair-jobs';
    api.get(url)
      .then((r) => setJobs(r.data.data || []))
      .catch((err) => setNotice({ text: err.response?.data?.message || 'Lỗi tải danh sách phiếu', type: 'error' }));
  }, [reload, statusFilter]);

  // Tải danh sách thợ máy để phân công
  useEffect(() => {
    api.get('/repair-jobs/mechanics')
      .then((r) => setMechanics(r.data.data || []))
      .catch(() => {});
  }, []);

  function openAssign(job) {
    setAssignModal({ open: true, job });
    setSelectedMechanicId(job.mechanic_id ? String(job.mechanic_id) : (mechanics[0]?.id ? String(mechanics[0].id) : ''));
  }

  function closeAssign() {
    setAssignModal({ open: false, job: null });
    setSelectedMechanicId('');
  }

  async function handleAssignSubmit(e) {
    e.preventDefault();
    if (!selectedMechanicId) return;

    setSubmitting(true);
    try {
      await api.put(`/repair-jobs/${assignModal.job.id}/assign`, {
        mechanicId: Number(selectedMechanicId),
      });
      const mechName = mechanics.find((m) => String(m.id) === String(selectedMechanicId))?.full_name || selectedMechanicId;
      setNotice({
        text: `Đã phân công thành công kỹ thuật viên [${mechName}] cho phiếu #${assignModal.job.id}!`,
        type: 'success',
      });
      closeAssign();
      setReload((n) => n + 1);
    } catch (err) {
      setNotice({
        text: err.response?.data?.message || 'Lỗi khi phân công kỹ thuật viên',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Danh sách phiếu sửa chữa & Phân công (US07)</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            className="form-control"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: 190 }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="pending">Chờ xử lý (pending)</option>
            <option value="diagnosing">Đang chẩn đoán (diagnosing)</option>
            <option value="approved">Đã duyệt (approved)</option>
            <option value="in_repair">Đang sửa chữa (in_repair)</option>
            <option value="completed">Đã hoàn thành (completed)</option>
            <option value="cancelled">Đã hủy (cancelled)</option>
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

      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Mã</th>
                <th>Biển số xe</th>
                <th>Khách hàng</th>
                <th>Mô tả / Yêu cầu</th>
                <th>Kỹ thuật viên</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id}>
                  <td><strong>#{j.id}</strong></td>
                  <td>
                    <strong>{j.license_plate}</strong>
                    <div style={{ fontSize: '12px', color: '#888' }}>{j.brand} {j.model}</div>
                  </td>
                  <td>{j.customer_name}</td>
                  <td style={{ maxWidth: 280, whiteSpace: 'normal', fontSize: '13px' }}>
                    {j.customer_request}
                  </td>
                  <td>
                    {j.mechanic_name ? (
                      <span style={{ fontWeight: 600, color: '#1890ff' }}>{j.mechanic_name}</span>
                    ) : (
                      <span style={{ color: '#8c8c8c', fontStyle: 'italic' }}>Chưa phân công</span>
                    )}
                  </td>
                  <td><StatusBadge status={j.status} /></td>
                  <td>
                    {(j.status === 'pending' || !j.mechanic_name) ? (
                      <button className="btn btn-primary" onClick={() => openAssign(j)} style={{ fontSize: '13px', padding: '6px 12px' }}>
                        Phân công thợ
                      </button>
                    ) : (
                      <button className="btn btn-outline" onClick={() => openAssign(j)} style={{ fontSize: '12px', padding: '4px 8px' }}>
                        Đổi thợ
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!jobs.length && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: '#888' }}>
                    Không có phiếu sửa chữa nào khớp bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Phân công kỹ thuật viên (US07) */}
      {assignModal.open && (
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
              width: '480px',
              maxWidth: '90%',
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: 12, color: '#1976d2' }}>
              Phân công kỹ thuật viên — Phiếu #{assignModal.job?.id}
            </h3>

            <div style={{ background: '#f5f5f5', padding: '12px', borderRadius: '6px', marginBottom: 16, fontSize: '13px' }}>
              <p style={{ margin: '0 0 6px 0' }}>
                <strong>Xe:</strong> {assignModal.job?.license_plate} ({assignModal.job?.brand} {assignModal.job?.model})
              </p>
              <p style={{ margin: '0 0 6px 0' }}>
                <strong>Khách hàng:</strong> {assignModal.job?.customer_name}
              </p>
              <p style={{ margin: 0 }}>
                <strong>Yêu cầu:</strong> {assignModal.job?.customer_request}
              </p>
            </div>

            <form onSubmit={handleAssignSubmit}>
              <div className="form-group">
                <label style={{ fontWeight: 600 }}>Chọn kỹ thuật viên (Mechanic) (*)</label>
                <select
                  className="form-control"
                  value={selectedMechanicId}
                  onChange={(e) => setSelectedMechanicId(e.target.value)}
                  required
                >
                  <option value="">-- Chọn kỹ thuật viên --</option>
                  {mechanics.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} ({m.email})
                    </option>
                  ))}
                </select>
                {mechanics.length === 0 && (
                  <small style={{ color: '#cf1322' }}>Không có tài khoản kỹ thuật viên nào trong hệ thống!</small>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" className="btn btn-outline" onClick={closeAssign} disabled={submitting}>
                  Hủy bỏ
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting || !selectedMechanicId}>
                  {submitting ? 'Đang lưu...' : 'Xác nhận phân công'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
