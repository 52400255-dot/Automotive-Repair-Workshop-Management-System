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
  diagnosing: 'Đang chẩn đoán',
  estimated: 'Đã báo giá',
  approved: 'Đã duyệt báo giá',
  in_repair: 'Đang sửa chữa',
  completed: 'Hoàn thành sửa chữa',
};

const TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'diagnosing', label: 'Đang chẩn đoán' },
  { key: 'in_repair', label: 'Đang sửa chữa' },
  { key: 'completed', label: 'Đã hoàn thành' },
];

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};
const modalStyle = {
  background: '#fff',
  borderRadius: '8px',
  padding: '24px',
  width: '540px',
  maxWidth: '90%',
  boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
};

const fmtDate = (v) => (v ? new Date(v).toLocaleString('vi-VN') : '');
const stockOf = (p) => p.stock_quantity ?? p.quantity_in_stock ?? p.quantity ?? 0;
const codeOf = (p) => p.part_code || p.sku || p.code || '';

export default function TaskBoardPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
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
    setLoading(true);
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
      showToast(`✓ Phiếu #${job.id} đã chuyển sang [${STATUS_LABEL[status] || status}] thành công!`, 'success');
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

  return (
    <div>
      <div className="page-header">
        <h1>Bảng công việc của kỹ thuật viên</h1>
      </div>

      {/* Toast thông báo */}
      {toast.text && (
        <div
          role="status"
          style={{
            position: 'fixed',
            top: 20,
            right: 20,
            zIndex: 2000,
            maxWidth: 380,
            padding: '12px 16px',
            borderRadius: 6,
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            backgroundColor: toast.type === 'success' ? '#f6ffed' : '#fff2f0',
            border: `1px solid ${toast.type === 'success' ? '#b7eb8f' : '#ffccc7'}`,
            color: toast.type === 'success' ? '#389e0d' : '#cf1322',
            cursor: 'pointer',
          }}
          onClick={() => setToast({ text: '', type: '' })}
        >
          {toast.text}
        </div>
      )}

      {/* Tab bộ lọc: lọc tại client nên phản hồi tức thì */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={tab === t.key ? 'btn btn-primary' : 'btn btn-outline'}
            onClick={() => setTab(t.key)}
            style={{ fontSize: 13 }}
          >
            {t.label} ({counts[t.key] || 0})
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        {visibleJobs.map((j) => {
          const used = partsOfJob(j);
          const busy = busyJobId === j.id;
          return (
            <div
              key={j.id}
              className="card"
              style={{ borderLeft: `4px solid ${j.status === 'completed' ? '#52c41a' : '#1976d2'}` }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <span style={{ fontSize: 18, fontWeight: 700, color: j.status === 'completed' ? '#389e0d' : '#1976d2' }}>
                    Phiếu #{j.id}
                  </span>
                  <span style={{ marginLeft: 12, fontSize: 16, fontWeight: 600 }}>
                    {j.license_plate} ({j.brand} {j.model})
                  </span>
                  <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>
                    Khách hàng: <strong>{j.customer_name}</strong> {j.customer_phone ? `— ${j.customer_phone}` : ''}
                  </div>
                </div>
                <StatusBadge status={j.status} />
              </div>

              <div style={{ background: '#fafafa', padding: '10px 14px', borderRadius: 6, marginBottom: 12, fontSize: 14 }}>
                <strong>Yêu cầu từ khách:</strong> {j.customer_request || 'Không có mô tả'}
              </div>

              {j.diagnosis_result && (
                <div style={{ background: '#e6f7ff', border: '1px solid #91d5ff', padding: '10px 14px', borderRadius: 6, marginBottom: 12, fontSize: 13 }}>
                  <div style={{ fontWeight: 600, color: '#0050b3', marginBottom: 4 }}>
                    Chẩn đoán hiện tại{j.diagnosed_at ? ` (lúc ${fmtDate(j.diagnosed_at)})` : ''}:
                  </div>
                  <div><strong>Kết quả:</strong> {j.diagnosis_result}</div>
                  {j.repair_suggestion && <div><strong>Đề xuất:</strong> {j.repair_suggestion}</div>}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  className="btn btn-outline"
                  disabled={j.status !== 'diagnosing' || submitting}
                  onClick={() => openDiagnosis(j)}
                  style={{ fontSize: 13 }}
                >
                  {j.diagnosis_result ? 'Cập nhật lại chẩn đoán' : 'Ghi kết quả chẩn đoán'}
                </button>

                {j.status === 'approved' && (
                  <button
                    className="btn btn-primary"
                    disabled={busy}
                    onClick={() => changeStatus(j, 'in_repair')}
                    style={{ fontSize: 14, fontWeight: 700, backgroundColor: '#1677ff', color: '#fff' }}
                  >
                    {busy ? 'Đang xử lý...' : '🛠️ Bắt đầu sửa chữa'}
                  </button>
                )}

                {j.status === 'in_repair' && (
                  <>
                    <button
                      className="btn btn-outline"
                      onClick={() => openPartModal(j)}
                      style={{ fontSize: 13 }}
                    >
                      🔩 Lấy phụ tùng sử dụng
                    </button>
                    <button
                      className="btn btn-success"
                      disabled={busy}
                      onClick={() => setCompleteModal({ open: true, job: j })}
                      style={{ fontSize: 14, fontWeight: 700, backgroundColor: '#52c41a', color: '#fff' }}
                    >
                      ✓ Hoàn thành sửa chữa
                    </button>
                  </>
                )}

                {j.status === 'completed' && (
                  <div style={{ color: '#389e0d', background: '#f6ffed', border: '1px solid #b7eb8f', padding: '6px 12px', borderRadius: 4, fontSize: 13, fontWeight: 600 }}>
                    ✓ Đã hoàn thành sửa chữa lúc {j.completed_at ? fmtDate(j.completed_at) : 'vừa xong'}
                  </div>
                )}
              </div>

              {/* Phụ tùng đã dùng */}
              {(used.length > 0 || j.status === 'in_repair') && (
                <div style={{ marginTop: 12, background: '#fffbe6', border: '1px solid #ffe58f', padding: '10px 14px', borderRadius: 6, fontSize: 13 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Phụ tùng đã sử dụng:</div>
                  {used.length === 0 ? (
                    <div style={{ color: '#888' }}>Chưa ghi nhận phụ tùng nào.</div>
                  ) : (
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {used.map((p, i) => (
                        <li key={`${p.name}-${i}`}>
                          {p.name} {p.code ? `(${p.code})` : ''} — <strong>x{p.quantity}</strong>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {!visibleJobs.length && (
          <div className="card" style={{ textAlign: 'center', padding: 36, color: '#888' }}>
            <h3>{loading ? 'Đang tải công việc...' : 'Hiện tại không có công việc sửa chữa nào khớp bộ lọc.'}</h3>
            {!loading && <p style={{ margin: 0 }}>Vui lòng kiểm tra lại sau hoặc liên hệ Quản lý dịch vụ.</p>}
          </div>
        )}
      </div>

      {/* Modal chẩn đoán (US06) */}
      {diagnosisModal.open && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3 style={{ marginTop: 0, marginBottom: 12, color: '#1976d2' }}>
              Ghi nhận chẩn đoán kỹ thuật — Phiếu #{diagnosisModal.job?.id}
            </h3>

            <div style={{ background: '#f5f5f5', padding: '10px 12px', borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
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

      {/* Modal xác nhận hoàn thành sửa chữa (US09) */}
      {completeModal.open && completeModal.job && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3 style={{ marginTop: 0, marginBottom: 12, color: '#389e0d' }}>
              Xác nhận hoàn thành sửa chữa — Phiếu #{completeModal.job.id}
            </h3>

            <div style={{ background: '#f5f5f5', padding: '10px 12px', borderRadius: 6, marginBottom: 12, fontSize: 13 }}>
              <strong>Phương tiện:</strong> {completeModal.job.license_plate} ({completeModal.job.brand} {completeModal.job.model})<br />
              <strong>Khách hàng:</strong> {completeModal.job.customer_name}<br />
              <strong>Yêu cầu:</strong> {completeModal.job.customer_request || 'Không có mô tả'}
            </div>

            {completeModal.job.diagnosis_result && (
              <div style={{ fontSize: 13, marginBottom: 12 }}>
                <strong>Chẩn đoán:</strong> {completeModal.job.diagnosis_result}
                {completeModal.job.repair_suggestion && (<><br /><strong>Hạng mục đề xuất:</strong> {completeModal.job.repair_suggestion}</>)}
              </div>
            )}

            <div style={{ fontSize: 13, marginBottom: 12 }}>
              <strong>Phụ tùng đã sử dụng:</strong>
              {partsOfJob(completeModal.job).length === 0 ? (
                <span style={{ color: '#888' }}> Chưa ghi nhận phụ tùng nào.</span>
              ) : (
                <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                  {partsOfJob(completeModal.job).map((p, i) => (
                    <li key={`${p.name}-${i}`}>{p.name} — x{p.quantity}</li>
                  ))}
                </ul>
              )}
            </div>

            <p style={{ fontSize: 13, color: '#cf1322', margin: '0 0 8px' }}>
              Sau khi xác nhận, phiếu sẽ chuyển sang “Hoàn thành” và không thể thao tác tiếp.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setCompleteModal({ open: false, job: null })}
                disabled={busyJobId === completeModal.job.id}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn btn-success"
                onClick={confirmComplete}
                disabled={busyJobId === completeModal.job.id}
                style={{ backgroundColor: '#52c41a', color: '#fff' }}
              >
                {busyJobId === completeModal.job.id ? 'Đang xử lý...' : 'Xác nhận hoàn thành'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal lấy phụ tùng (US11) */}
      {partModal.open && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3 style={{ marginTop: 0, marginBottom: 12, color: '#1976d2' }}>
              Lấy phụ tùng sử dụng — Phiếu #{partModal.job?.id}
            </h3>

            <form onSubmit={handleDeductPartSubmit}>
              <div className="form-group">
                <label style={{ fontWeight: 600 }}>Phụ tùng trong kho (*)</label>
                <select
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
                <label style={{ fontWeight: 600 }}>Số lượng (*)</label>
                <input
                  type="number"
                  className="form-control"
                  min={1}
                  max={selectedPart ? stockOf(selectedPart) : undefined}
                  value={partQuantity}
                  onChange={(e) => setPartQuantity(e.target.value)}
                  required
                />
                {overStock && (
                  <div style={{ color: '#cf1322', fontSize: 12, marginTop: 4 }}>
                    Số lượng vượt quá tồn kho ({stockOf(selectedPart)}).
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" className="btn btn-outline" onClick={closePartModal} disabled={submitting}>
                  Đóng
                </button>
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
