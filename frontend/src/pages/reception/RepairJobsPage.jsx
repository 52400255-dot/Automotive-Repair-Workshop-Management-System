/**
 * RepairJobsPage — Quản lý danh sách phiếu sửa chữa & Phân công kỹ thuật viên (US07).
 * Cho phép lọc theo trạng thái, mở modal phân công thợ máy từ danh sách thực tế.
 */
import { useEffect, useState } from 'react';
import api from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import EstimateModal from './EstimateModal';

export default function RepairJobsPage() {
  const [jobs, setJobs] = useState([]);
  const [mechanics, setMechanics] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [notice, setNotice] = useState({ text: '', type: '' });
  const [reload, setReload] = useState(0);

  // State cho Modal Phân công
  const [assignModal, setAssignModal] = useState({ open: false, job: null });
  const [selectedMechanicId, setSelectedMechanicId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [estimateJob, setEstimateJob] = useState(null);
  const [deleteJob, setDeleteJob] = useState(null);
  const [deletingJob, setDeletingJob] = useState(false);

  // Tải danh sách phiếu sửa chữa
  useEffect(() => {
    api.get('/repair-jobs')
      .then((r) => setJobs(r.data.data || []))
      .catch((err) => setNotice({ text: err.response?.data?.message || 'Lỗi tải danh sách phiếu', type: 'error' }));
  }, [reload]);
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

  async function handleDeleteJob() {
    if (!deleteJob || deletingJob) return;
    setDeletingJob(true);
    setNotice({ text: '', type: '' });
    try {
      await api.delete(`/repair-jobs/${deleteJob.id}`);
      setNotice({ text: `Đã xóa phiếu #${deleteJob.id}.`, type: 'success' });
      setDeleteJob(null);
      setReload((current) => current + 1);
    } catch (err) {
      setNotice({
        text: err.response?.data?.message || 'Không thể xóa phiếu sửa chữa.',
        type: 'error',
      });
      setDeleteJob(null);
    } finally {
      setDeletingJob(false);
    }
  }

  function handleEstimateCreated(jobId) {
  setEstimateJob(null);

  setNotice({
    text: `Đã lập báo giá cho phiếu #${jobId}. Phiếu đã chuyển sang trạng thái chờ duyệt báo giá.`,
    type: 'success',
  });

  setReload((current) => current + 1);
}

  const tabItems = [
    { key: '', label: 'Tất cả' },
    { key: 'pending', label: 'Chờ tiếp nhận' },
    { key: 'diagnosing', label: 'Đang chẩn đoán' },
    { key: 'estimated', label: 'Chờ duyệt báo giá' },
    { key: 'approved', label: 'Đã duyệt' },
    { key: 'in_repair', label: 'Đang sửa chữa' },
    { key: 'completed', label: 'Hoàn thành' },
  ];
  const matchesTab = (job, key) => !key || job.status === key;
  const visibleJobs = jobs.filter((job) => {
    const query = searchQuery.trim().toLowerCase();
    const haystack = [job.id, job.license_plate, job.brand, job.model, job.customer_name, job.customer_request, job.mechanic_name].filter(Boolean).join(' ').toLowerCase();
    return matchesTab(job, statusFilter) && (!query || haystack.includes(query));
  });
  const pendingCount = jobs.filter((job) => job.status === 'pending').length;
  const activeCount = jobs.filter((job) => ['diagnosing', 'approved', 'in_repair'].includes(job.status)).length;
  const estimatedCount = jobs.filter((job) => job.status === 'estimated').length;
  return (
    <div className="repair-jobs-page">
      <div className="page-header repair-jobs-header">
        <div>
          <p className="eyebrow">ĐIỀU PHỐI XƯỞNG</p>
          <h1>Phiếu sửa chữa</h1>
          <p>Theo dõi yêu cầu, báo giá và phân công kỹ thuật viên cho từng phương tiện.</p>
        </div>
        <span className="repair-jobs-live"><i /> Theo dõi công việc</span>
      </div>

      {notice.text && (
        <div className={'alert ' + (notice.type === 'success' ? 'alert-success' : 'alert-error')} role="status">
          {notice.text}
        </div>
      )}

      <div className="repair-overview-cards">
        <article><span className="overview-icon overview-icon-all" aria-hidden="true">▤</span><div><small>Tổng phiếu</small><strong>{jobs.length}</strong></div><span className="overview-helper">Trong danh sách xưởng</span></article>
        <article><span className="overview-icon overview-icon-waiting" aria-hidden="true">◷</span><div><small>Chờ phân công</small><strong>{pendingCount}</strong></div><span className="overview-helper">Cần chọn kỹ thuật viên</span></article>
        <article><span className="overview-icon overview-icon-active" aria-hidden="true">⚙</span><div><small>Đang xử lý</small><strong>{activeCount}</strong></div><span className="overview-helper">Đang chẩn đoán hoặc sửa</span></article>
        <article><span className="overview-icon overview-icon-estimate" aria-hidden="true">₫</span><div><small>Chờ duyệt báo giá</small><strong>{estimatedCount}</strong></div><span className="overview-helper">Đợi xác nhận từ khách</span></article>
      </div>

      <section className="card repair-queue-card">
        <div className="repair-queue-heading">
          <div><span className="panel-kicker">THEO DÕI TIẾN ĐỘ</span><h2>Danh sách phiếu</h2><p>Chọn trạng thái hoặc tìm theo biển số, khách hàng và yêu cầu sửa chữa.</p></div>
          <span className="record-count">{visibleJobs.length} phiếu</span>
        </div>

        <div className="repair-queue-toolbar">
          <div className="repair-status-tabs" role="group" aria-label="Lọc phiếu theo trạng thái">
            {tabItems.map((tab) => {
              const count = jobs.filter((job) => matchesTab(job, tab.key)).length;
              return (
                <button
                  key={tab.key || 'all'}
                  type="button"
                  className={'repair-status-tab' + (statusFilter === tab.key ? ' is-active' : '')}
                  aria-pressed={statusFilter === tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                >
                  {tab.label}<span>{count}</span>
                </button>
              );
            })}
          </div>
          <label className="repair-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm phiếu, biển số, khách hàng..."
              aria-label="Tìm phiếu sửa chữa"
            />
          </label>
        </div>

        <div className="table-wrapper repair-queue-table">
          <table>
            <thead>
              <tr><th>Phiếu / Phương tiện</th><th>Khách hàng</th><th>Yêu cầu</th><th>Kỹ thuật viên</th><th>Trạng thái</th><th>Thao tác</th></tr>
            </thead>
            <tbody>
              {visibleJobs.map((j) => (
                <tr key={j.id}>
                  <td><strong>#{j.id}</strong><div className="table-secondary"><b>{j.license_plate}</b> · {j.brand} {j.model}</div></td>
                  <td>{j.customer_name || '—'}</td>
                  <td className="job-request-cell">{j.customer_request || 'Không có mô tả'}</td>
                  <td>{j.mechanic_name ? <span className="assigned-mechanic">{j.mechanic_name}</span> : <span className="unassigned-mechanic">Chưa phân công</span>}</td>
                  <td><StatusBadge status={j.status} /></td>
                  <td>
                    <div className="action-buttons">
                      {['pending', 'diagnosing'].includes(j.status) && (
                        j.status === 'pending' || !j.mechanic_name
                          ? <button type="button" className="btn btn-primary" onClick={() => openAssign(j)}>Phân công</button>
                          : <button type="button" className="btn btn-outline" onClick={() => openAssign(j)}>Đổi thợ</button>
                      )}
                      {j.status === 'diagnosing' && <button type="button" className="btn btn-success" onClick={() => setEstimateJob(j)}>Lập báo giá</button>}
                      {['pending', 'diagnosing', 'estimated', 'cancelled'].includes(j.status) && (
                        <button type="button" className="btn btn-danger" onClick={() => setDeleteJob(j)}>Xóa phiếu</button>
                      )}
                      {!['pending', 'diagnosing', 'estimated', 'cancelled'].includes(j.status) && <span className="queue-action-muted">Đang theo dõi</span>}
                    </div>
                  </td>
                </tr>
              ))}
              {!visibleJobs.length && (
                <tr><td colSpan={6} className="repair-empty-cell">{searchQuery ? 'Không tìm thấy phiếu phù hợp.' : 'Không có phiếu sửa chữa nào trong trạng thái này.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      {/* Modal Phân công kỹ thuật viên (US07) */}
      {assignModal.open && (
        <div className="modal-backdrop">
          <div className="modal-panel assign-modal" role="dialog" aria-modal="true" aria-labelledby="assign-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Phân công kỹ thuật</p>
                <h2 id="assign-title">Phiếu #{assignModal.job?.id}</h2>
              </div>
              <button type="button" className="btn btn-outline modal-close" onClick={closeAssign} disabled={submitting} aria-label="Đóng">×</button>
            </div>

            <div className="assign-job-summary">
              <p><span>Xe</span><strong>{assignModal.job?.license_plate} · {assignModal.job?.brand} {assignModal.job?.model}</strong></p>
              <p><span>Khách hàng</span><strong>{assignModal.job?.customer_name}</strong></p>
              <p><span>Yêu cầu</span><strong>{assignModal.job?.customer_request}</strong></p>
            </div>

            <form onSubmit={handleAssignSubmit}>
              <div className="form-group">
                <label htmlFor="assign-mechanic">Kỹ thuật viên</label>
                <select
                  id="assign-mechanic"
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
                  <small className="form-hint form-hint-warning">Không có tài khoản kỹ thuật viên nào trong hệ thống.</small>
                )}
              </div>

              <div className="modal-actions">
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
      {estimateJob && (
        <EstimateModal
          job={estimateJob}
          onClose={() => setEstimateJob(null)}
          onCreated={handleEstimateCreated}
        />
      )}
      {deleteJob && (
        <div className="modal-backdrop">
          <div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="delete-repair-job-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Xóa dữ liệu phiếu</p>
                <h2 id="delete-repair-job-title">Xác nhận xóa phiếu #{deleteJob.id}</h2>
              </div>
              <button type="button" className="btn btn-outline modal-close" onClick={() => setDeleteJob(null)} disabled={deletingJob} aria-label="Đóng">×</button>
            </div>
            <div className="assign-job-summary">
              <p><span>Xe</span><strong>{deleteJob.license_plate} · {deleteJob.brand} {deleteJob.model}</strong></p>
              <p><span>Khách hàng</span><strong>{deleteJob.customer_name}</strong></p>
              <p><span>Trạng thái</span><strong><StatusBadge status={deleteJob.status} /></strong></p>
            </div>
            <p>Thao tác này xóa phiếu cùng chẩn đoán, phân công và báo giá liên quan. Xe và hồ sơ khách hàng vẫn được giữ lại.</p>
            <p style={{ marginTop: 8, color: 'var(--text-secondary)' }}>
              Phiếu đã được khách duyệt, đã bắt đầu sửa, có phụ tùng đã sử dụng hoặc có hóa đơn sẽ không thể xóa để bảo toàn lịch sử.
            </p>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setDeleteJob(null)} disabled={deletingJob}>Giữ lại</button>
              <button type="button" className="btn btn-danger" onClick={handleDeleteJob} disabled={deletingJob}>
                {deletingJob ? 'Đang xóa...' : 'Xóa phiếu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
