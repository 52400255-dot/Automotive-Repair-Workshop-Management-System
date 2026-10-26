/**
 * TaskBoardPage — Bảng công việc của Kỹ thuật viên / Thợ máy (US08, US06, US09, US11).
 * Cho phép:
 *   - Xem danh sách phiếu được phân công cho chính thợ đăng nhập (US08).
 *   - Nhập / cập nhật chẩn đoán kỹ thuật qua Modal (US06).
 *   - Cập nhật tiến độ theo FSM: approved -> in_repair -> completed (US09).
 *   - Lấy phụ tùng sử dụng cho phiếu đang sửa và xem danh sách đã dùng (US11).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import { useAuth } from '../../context/AuthContext';

// Máy trạng thái hữu hạn (FSM): chỉ cho phép đi tiếp đúng 1 bước.
const NEXT_STATUS = {
  pending: 'diagnosing',
  diagnosing: 'estimated',
  estimated: 'approved',
  approved: 'in_repair',
  in_repair: 'completed',
};
const canTransition = (from, to) => NEXT_STATUS[from] === to;

const STATUS_LABEL = {
  pending: 'Chờ phân công',
  diagnosing: 'Đang chẩn đoán',
  estimated: 'Đã báo giá',
  approved: 'Đã duyệt báo giá',
  in_repair: 'Đang sửa chữa',
  completed: 'Hoàn thành sửa chữa',
  cancelled: 'Đã hủy',
};

const statusLabel = (status) => STATUS_LABEL[status] || status;

const TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'diagnosing', label: 'Đang chẩn đoán' },
  { key: 'in_repair', label: 'Đang sửa chữa' },
  { key: 'completed', label: 'Đã hoàn thành' },
];

const fmtDate = (v) => (v ? new Date(v).toLocaleString('vi-VN') : '');
const stockOf = (p) => p.stock_quantity ?? p.quantity_in_stock ?? p.quantity ?? 0;
const codeOf = (p) => p.part_code || p.sku || p.code || '';

export default function TaskBoardPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [toast, setToast] = useState({ text: '', type: '' });
  const [reload, setReload] = useState(0);
  const [busyJobId, setBusyJobId] = useState(null);

  // Modal chẩn đoán (US06)
  const [diagnosisModal, setDiagnosisModal] = useState({ open: false, job: null });
  const [diagnosisResult, setDiagnosisResult] = useState('');
  const [repairSuggestion, setRepairSuggestion] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Modal xác nhận hoàn thành (US09)
  const [completeModal, setCompleteModal] = useState({ open: false, job: null });

  // Modal phụ tùng (US11)
  const [partModal, setPartModal] = useState({ open: false, job: null });
  const [partsList, setPartsList] = useState([]);
  const [selectedPartId, setSelectedPartId] = useState('');
  const [partQuantity, setPartQuantity] = useState(1);
  // Ghi nhận phụ tùng đã dùng trong phiên làm việc: { [jobId]: [{ partId, name, code, quantity }] }
  const [usedParts, setUsedParts] = useState({});

  const showToast = useCallback((text, type) => setToast({ text, type }), []);

  // Tự ẩn toast sau 4 giây
  useEffect(() => {
    if (!toast.text) return undefined;
    const t = setTimeout(() => setToast({ text: '', type: '' }), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // Tải toàn bộ phiếu của thợ 1 lần; tab lọc ở client nên phản hồi tức thì.
  useEffect(() => {
    let cancelled = false;
    api.get('/repair-jobs/my-jobs')
      .then((r) => { if (!cancelled) setJobs(r.data.data || []); })
      .catch((err) => {
        if (!cancelled) showToast(err.response?.data?.message || 'Lỗi tải danh sách công việc', 'error');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [reload, showToast]);

  const counts = useMemo(() => {
    const c = { all: jobs.length };
    jobs.forEach((j) => { c[j.status] = (c[j.status] || 0) + 1; });
    return c;
  }, [jobs]);

  const visibleJobs = useMemo(
    () => (tab === 'all' ? jobs : jobs.filter((j) => j.status === tab)),
    [jobs, tab]
  );

  // Phụ tùng đã dùng: ưu tiên dữ liệu backend trả về (nếu có) + ghi nhận trong phiên
  function partsOfJob(job) {
    const fromServer = Array.isArray(job.used_parts) ? job.used_parts : [];
    const local = usedParts[job.id] || [];
    return [
      ...fromServer.map((p) => ({
        name: p.name || p.part_name,
        code: p.part_code || p.sku || '',
        quantity: p.quantity ?? p.quantity_used,
      })),
      ...local,
    ];
  }

  // ===== Chuyển trạng thái (US09) =====
  async function changeStatus(job, status) {
    // Chặn nhảy cóc trạng thái ở client (backend vẫn kiểm tra lần nữa)
    if (!canTransition(job.status, status)) {
      showToast(`Không thể chuyển từ "${STATUS_LABEL[job.status] || job.status}" sang "${STATUS_LABEL[status] || status}".`, 'error');
      return false;
    }
    setBusyJobId(job.id);
    try {
      await api.put(`/repair-jobs/${job.id}/status`, { status });
      showToast(`✓ Phiếu #${job.id} đã chuyển sang [${statusLabel(status)}] thành công!`, 'success');
      // Cập nhật tức thì trên giao diện, sau đó đồng bộ lại từ server
      setJobs((prev) => prev.map((j) => (
        j.id === job.id
          ? { ...j, status, ...(status === 'completed' ? { completed_at: new Date().toISOString() } : {}) }
          : j
      )));
      setReload((n) => n + 1);
      return true;
    } catch (err) {
      showToast(err.response?.data?.message || 'Lỗi cập nhật trạng thái', 'error');
      return false;
    } finally {
      setBusyJobId(null);
    }
  }

  async function confirmComplete() {
    const job = completeModal.job;
    if (!job) return;
    const ok = await changeStatus(job, 'completed');
    if (ok) setCompleteModal({ open: false, job: null });
  }

  // ===== Chẩn đoán (US06) =====
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
      showToast(`✓ Đã lưu kết quả chẩn đoán cho phiếu #${diagnosisModal.job.id}!`, 'success');
      closeDiagnosis();
      setReload((n) => n + 1);
    } catch (err) {
      showToast(err.response?.data?.message || 'Lỗi khi lưu chẩn đoán', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  // ===== Phụ tùng (US11) =====
  async function openPartModal(job) {
    setPartModal({ open: true, job });
    setSelectedPartId('');
    setPartQuantity(1);
    try {
      const res = await api.get('/spare-parts');
      const data = res.data?.data ?? res.data ?? [];
      setPartsList(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast(err.response?.data?.message || 'Lỗi tải danh sách phụ tùng', 'error');
    }
  }

  function closePartModal() {
    setPartModal({ open: false, job: null });
    setSelectedPartId('');
    setPartQuantity(1);
  }

  const selectedPart = partsList.find((p) => String(p.id) === String(selectedPartId));
  const qtyNum = Number(partQuantity);
  const qtyInvalid = !Number.isInteger(qtyNum) || qtyNum <= 0;
  const overStock = selectedPart ? qtyNum > Number(stockOf(selectedPart)) : false;

  async function handleDeductPartSubmit(e) {
    e.preventDefault();
    if (!selectedPart || qtyInvalid || overStock) return;
    const job = partModal.job;
    setSubmitting(true);
    try {
      await api.post(`/spare-parts/${selectedPart.id}/deduct`, {
        repairJobId: job.id,
        quantity: qtyNum,
      });
      setUsedParts((prev) => ({
        ...prev,
        [job.id]: [
          ...(prev[job.id] || []),
          { partId: selectedPart.id, name: selectedPart.name, code: codeOf(selectedPart), quantity: qtyNum },
        ],
      }));
      showToast(`✓ Đã ghi nhận ${qtyNum} x ${selectedPart.name} cho Phiếu #${job.id}!`, 'success');
      closePartModal();
      setReload((n) => n + 1);
    } catch (err) {
      showToast(err.response?.data?.message || 'Lỗi khi trừ tồn kho phụ tùng', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  const mechanicName = (user?.fullName || user?.email || '').trim().split(/\s+/).slice(-1)[0];
  const workTotal = jobs.length || 1;
  const completedPercent = Math.round((counts.completed || 0) / workTotal * 100);
  const usedPartRows = jobs.flatMap((job) => partsOfJob(job).map((part) => ({ ...part, jobId: job.id }))).slice(0, 4);
  const partsRecorded = jobs.reduce((sum, job) => sum + partsOfJob(job).reduce((partSum, part) => partSum + Number(part.quantity || 0), 0), 0);
  return (
    <div className="task-board-page">
      <div className="page-header task-board-heading">
        <div>
          <p className="eyebrow">BẢNG CÔNG VIỆC KỸ THUẬT</p>
          <h1>{mechanicName ? 'Chào ' + mechanicName + ', sẵn sàng bắt đầu?' : 'Công việc của tôi'}</h1>
          <p>Các phiếu được giao, tiến độ sửa chữa và phụ tùng đã ghi nhận.</p>
        </div>
        <span className="task-board-live"><i /> Đang hoạt động</span>
      </div>

      <div className="task-board-metrics">
        <div className="task-metric-card"><span>Phiếu được giao</span><strong>{counts.all}</strong><small>Tổng số phiếu của bạn</small></div>
        <div className="task-metric-card"><span>Đang sửa chữa</span><strong>{counts.in_repair || 0}</strong><small>Đang xử lý tại xưởng</small></div>
        <div className="task-metric-card"><span>Đã hoàn thành</span><strong>{counts.completed || 0}</strong><small>Đã hoàn tất sửa chữa</small></div>
      </div>
      {toast.text && (
        <div
          className={`toast-notice ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}
          role="status"
          onClick={() => setToast({ text: '', type: '' })}
        >
          {toast.text}
        </div>
      )}

      <div className="filter-tabs" role="group" aria-label="Lọc công việc theo trạng thái">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`filter-tab${tab === t.key ? ' is-active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}<span>{counts[t.key] || 0}</span>
          </button>
        ))}
      </div>

      <div className="task-board-content">
        <div className="task-list">
        {visibleJobs.map((j) => {
          const used = partsOfJob(j);
          const busy = busyJobId === j.id;
          return (
            <article key={j.id} className={`card job-card job-card-${j.status}`}>
              <div className="job-card-header">
                <div className="job-card-identity">
                  <span className="job-number">Phiếu #{j.id}</span>
                  <h2>{j.license_plate} <span>{j.brand} {j.model}</span></h2>
                  <p>Khách hàng: <strong>{j.customer_name}</strong>{j.customer_phone ? ` · ${j.customer_phone}` : ''}</p>
                </div>
                <StatusBadge status={j.status} />
              </div>

              <section className="job-detail-block customer-request-block">
                <span className="job-detail-label">Yêu cầu từ khách</span>
                <p>{j.customer_request || 'Không có mô tả'}</p>
              </section>

              {j.diagnosis_result && (
                <section className="job-detail-block diagnosis-block">
                  <span className="job-detail-label">
                    Chẩn đoán hiện tại{j.diagnosed_at ? ` · ${fmtDate(j.diagnosed_at)}` : ''}
                  </span>
                  <p><strong>Kết quả:</strong> {j.diagnosis_result}</p>
                  {j.repair_suggestion && <p><strong>Đề xuất:</strong> {j.repair_suggestion}</p>}
                </section>
              )}

              <div className="job-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={j.status !== 'diagnosing' || submitting}
                  onClick={() => openDiagnosis(j)}
                >
                  {j.diagnosis_result ? 'Cập nhật chẩn đoán' : 'Ghi kết quả chẩn đoán'}
                </button>

                {j.status === 'approved' && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={busy}
                    onClick={() => changeStatus(j, 'in_repair')}
                  >
                    {busy ? 'Đang xử lý...' : 'Bắt đầu sửa chữa'}
                  </button>
                )}

                {j.status === 'in_repair' && (
                  <>
                    <button type="button" className="btn btn-outline" onClick={() => openPartModal(j)}>
                      Lấy phụ tùng sử dụng
                    </button>
                    <button
                      type="button"
                      className="btn btn-success"
                      disabled={busy}
                      onClick={() => setCompleteModal({ open: true, job: j })}
                    >
                      Hoàn thành sửa chữa
                    </button>
                  </>
                )}

                {j.status === 'completed' && (
                  <div className="job-completed-note">
                    Đã hoàn thành sửa chữa lúc {j.completed_at ? fmtDate(j.completed_at) : 'vừa xong'}
                  </div>
                )}
              </div>

              {(used.length > 0 || j.status === 'in_repair') && (
                <section className="job-detail-block used-parts-block">
                  <span className="job-detail-label">Phụ tùng đã sử dụng</span>
                  {used.length === 0 ? (
                    <p className="empty-note">Chưa ghi nhận phụ tùng nào.</p>
                  ) : (
                    <ul>
                      {used.map((p, i) => (
                        <li key={`${p.name}-${i}`}>
                          {p.name} {p.code ? `(${p.code})` : ''} <strong>×{p.quantity}</strong>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )}
            </article>
          );
        })}

        {!visibleJobs.length && (
          <div className="card empty-state" role="status">
            <span className="empty-state-mark" aria-hidden="true">✓</span>
            <h2>{loading ? 'Đang tải công việc...' : 'Không có công việc trong mục này'}</h2>
            {!loading && <p>Các phiếu được giao sẽ xuất hiện tại đây.</p>}
          </div>
        )}
      </div>

        <aside className="task-board-aside">
          <section className="card task-progress-panel">
            <div className="task-aside-heading">
              <div><span className="panel-kicker">TỔNG QUAN</span><h2>Tiến độ công việc</h2></div>
              <span className="task-progress-mark" aria-hidden="true">↗</span>
            </div>
            <div className="task-progress-score"><strong>{completedPercent}%</strong><span>{counts.completed || 0} trên {counts.all} phiếu hoàn tất</span></div>
            <div className="task-progress-track" role="progressbar" aria-label="Tỷ lệ phiếu đã hoàn thành" aria-valuemin="0" aria-valuemax="100" aria-valuenow={completedPercent}>
              <span style={{ width: completedPercent + '%' }} />
            </div>
            <div className="task-status-breakdown">
              {[
                { key: 'pending', label: 'Chờ phân công', color: 'task-dot-waiting' },
                { key: 'diagnosing', label: 'Đang chẩn đoán', color: 'task-dot-diagnosis' },
                { key: 'in_repair', label: 'Đang sửa chữa', color: 'task-dot-repair' },
                { key: 'completed', label: 'Đã hoàn thành', color: 'task-dot-complete' },
              ].map((item) => (
                <div key={item.key}><span><i className={item.color} />{item.label}</span><strong>{counts[item.key] || 0}</strong></div>
              ))}
            </div>
          </section>

          <section className="card task-parts-panel">
            <div className="task-aside-heading">
              <div><span className="panel-kicker">VẬT TƯ XƯỞNG</span><h2>Phụ tùng đã dùng</h2></div>
              <span className="task-parts-total">{partsRecorded}</span>
            </div>
            {usedPartRows.length ? (
              <ul className="task-used-parts-list">
                {usedPartRows.map((part, index) => (
                  <li key={part.jobId + '-' + part.name + '-' + index}>
                    <span className="task-part-icon" aria-hidden="true">⌁</span>
                    <span><strong>{part.name}</strong><small>Phiếu #{part.jobId}</small></span>
                    <b>×{part.quantity}</b>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="task-parts-empty">Các phụ tùng được ghi nhận trong lúc sửa sẽ hiển thị tại đây.</p>
            )}
            <p className="task-stock-note">Tổng số lượng phụ tùng đã ghi nhận trên các phiếu.</p>
          </section>
        </aside>
      </div>

      {diagnosisModal.open && (
        <div className="modal-backdrop">
          <div className="modal-panel task-modal" role="dialog" aria-modal="true" aria-labelledby="diagnosis-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Cập nhật kỹ thuật</p>
                <h2 id="diagnosis-title">Chẩn đoán · Phiếu #{diagnosisModal.job?.id}</h2>
              </div>
              <button type="button" className="btn btn-outline modal-close" onClick={closeDiagnosis} disabled={submitting} aria-label="Đóng">×</button>
            </div>

            <div className="modal-context">
              <p><span>Phương tiện</span><strong>{diagnosisModal.job?.license_plate} · {diagnosisModal.job?.brand} {diagnosisModal.job?.model}</strong></p>
              <p><span>Yêu cầu</span><strong>{diagnosisModal.job?.customer_request}</strong></p>
            </div>

            <form onSubmit={handleDiagnosisSubmit}>
              <div className="form-group">
                <label htmlFor="diagnosis-result">Kết quả kiểm tra / chẩn đoán <em>(bắt buộc)</em></label>
                <textarea
                  id="diagnosis-result"
                  className="form-control"
                  rows={3}
                  value={diagnosisResult}
                  onChange={(e) => setDiagnosisResult(e.target.value)}
                  placeholder="Ghi lại các dấu hiệu, kết quả kiểm tra và nguyên nhân xác định được..."
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="repair-suggestion">Đề xuất sửa chữa và phụ tùng thay thế</label>
                <textarea
                  id="repair-suggestion"
                  className="form-control"
                  rows={3}
                  value={repairSuggestion}
                  onChange={(e) => setRepairSuggestion(e.target.value)}
                  placeholder="Nêu phương án sửa chữa và phụ tùng cần dùng nếu có..."
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={closeDiagnosis} disabled={submitting}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={submitting || !diagnosisResult.trim()}>
                  {submitting ? 'Đang lưu...' : 'Lưu chẩn đoán'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {completeModal.open && completeModal.job && (
        <div className="modal-backdrop">
          <div className="modal-panel task-modal" role="dialog" aria-modal="true" aria-labelledby="complete-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Xác nhận bàn giao</p>
                <h2 id="complete-title">Hoàn thành · Phiếu #{completeModal.job.id}</h2>
              </div>
              <button
                type="button"
                className="btn btn-outline modal-close"
                onClick={() => setCompleteModal({ open: false, job: null })}
                disabled={busyJobId === completeModal.job.id}
                aria-label="Đóng"
              >×</button>
            </div>

            <div className="modal-context">
              <p><span>Phương tiện</span><strong>{completeModal.job.license_plate} · {completeModal.job.brand} {completeModal.job.model}</strong></p>
              <p><span>Khách hàng</span><strong>{completeModal.job.customer_name}</strong></p>
              <p><span>Yêu cầu</span><strong>{completeModal.job.customer_request || 'Không có mô tả'}</strong></p>
            </div>

            {completeModal.job.diagnosis_result && (
              <div className="completion-detail">
                <p><strong>Chẩn đoán:</strong> {completeModal.job.diagnosis_result}</p>
                {completeModal.job.repair_suggestion && <p><strong>Hạng mục đề xuất:</strong> {completeModal.job.repair_suggestion}</p>}
              </div>
            )}

            <div className="completion-detail">
              <strong>Phụ tùng đã sử dụng</strong>
              {partsOfJob(completeModal.job).length === 0 ? (
                <p className="empty-note">Chưa ghi nhận phụ tùng nào.</p>
              ) : (
                <ul>
                  {partsOfJob(completeModal.job).map((p, i) => (
                    <li key={`${p.name}-${i}`}>{p.name} · ×{p.quantity}</li>
                  ))}
                </ul>
              )}
            </div>

            <p className="confirmation-note">Sau khi xác nhận, phiếu sẽ chuyển sang “Hoàn thành” và không thể thao tác tiếp.</p>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setCompleteModal({ open: false, job: null })}
                disabled={busyJobId === completeModal.job.id}
              >Hủy</button>
              <button
                type="button"
                className="btn btn-success"
                onClick={confirmComplete}
                disabled={busyJobId === completeModal.job.id}
              >
                {busyJobId === completeModal.job.id ? 'Đang xử lý...' : 'Xác nhận hoàn thành'}
              </button>
            </div>
          </div>
        </div>
      )}

      {partModal.open && (
        <div className="modal-backdrop">
          <div className="modal-panel task-modal" role="dialog" aria-modal="true" aria-labelledby="part-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Vật tư xưởng</p>
                <h2 id="part-title">Lấy phụ tùng · Phiếu #{partModal.job?.id}</h2>
              </div>
              <button type="button" className="btn btn-outline modal-close" onClick={closePartModal} disabled={submitting} aria-label="Đóng">×</button>
            </div>

            <form onSubmit={handleDeductPartSubmit}>
              <div className="form-group">
                <label htmlFor="repair-part">Phụ tùng trong kho <em>(bắt buộc)</em></label>
                <select
                  id="repair-part"
                  className="form-control"
                  value={selectedPartId}
                  onChange={(e) => setSelectedPartId(e.target.value)}
                  required
                >
                  <option value="">-- Chọn phụ tùng --</option>
                  {partsList.map((p) => (
                    <option key={p.id} value={p.id} disabled={Number(stockOf(p)) <= 0}>
                      {p.name} {codeOf(p) ? `(${codeOf(p)})` : ''} — tồn: {stockOf(p)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="part-quantity">Số lượng <em>(bắt buộc)</em></label>
                <input
                  id="part-quantity"
                  type="number"
                  className="form-control"
                  min={1}
                  max={selectedPart ? stockOf(selectedPart) : undefined}
                  value={partQuantity}
                  onChange={(e) => setPartQuantity(e.target.value)}
                  required
                />
                {overStock && (
                  <div className="form-hint form-hint-warning">Số lượng vượt quá tồn kho ({stockOf(selectedPart)}).</div>
                )}
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={closePartModal} disabled={submitting}>Hủy</button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || !selectedPart || qtyInvalid || overStock}
                >
                  {submitting ? 'Đang ghi nhận...' : 'Xác nhận sử dụng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
