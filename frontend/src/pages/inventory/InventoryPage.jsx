/**
 * InventoryPage — Quản lý kho phụ tùng (US10, US11, US12)
 *  - US10: danh sách lấy từ API thật, thêm mới / chỉnh sửa phụ tùng bằng modal
 *  - US11: nhập kho bằng modal + ghi nhận phụ tùng đã dùng cho phiếu sửa chữa (deduct)
 *  - US12: tab "Sắp hết hàng" + badge cảnh báo tồn kho thấp
 * Không dùng prompt()/alert() của trình duyệt.
 */
import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// Vai trò được thêm/sửa/nhập kho/ghi nhận sử dụng (khớp phân quyền backend)
const MANAGE_ROLES = ['warehouse_staff', 'admin'];
// Vai trò được gọi GET /spare-parts/low-stock (các vai trò khác sẽ bị 403 → tự đăng xuất)
const LOW_STOCK_ROLES = ['warehouse_staff', 'service_manager', 'admin'];

const MAX_QTY = 1000000000; // giới hạn an toàn cho NUMERIC(12,2)
const MAX_MONEY = 1000000000000; // giới hạn an toàn cho NUMERIC(14,2)

/* ===================== Hàm tiện ích ===================== */

const formatMoney = (value) => `${Number(value || 0).toLocaleString('vi-VN')} đ`;
const formatQty = (value) =>
  Number(value || 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 });

const isLow = (p) => Number(p.stock_quantity) <= Number(p.min_stock || 0);
const isEmpty = (p) => Number(p.stock_quantity) <= 0;

const isPositiveInt = (v) =>
  /^\d+$/.test(String(v).trim()) && Number(v) > 0 && Number(v) <= MAX_QTY;
const isNonNegInt = (v) => /^\d+$/.test(String(v).trim()) && Number(v) <= MAX_QTY;
const isMoney = (v) => /^\d+(\.\d{1,2})?$/.test(String(v).trim()) && Number(v) < MAX_MONEY;

function errorText(err, fallback) {
  const status = err.response?.status;
  const msg = err.response?.data?.message;
  if (status === 409 && /Duplicate/i.test(msg || '')) return 'Mã phụ tùng đã tồn tại.';
  return msg || fallback;
}

/* ===================== Thành phần nhỏ ===================== */

function Field({ label, error, children }) {
  return (
    <div className="form-group">
      <label>{label}</label>
      {children}
      {error && (
        <div style={{ color: 'var(--error)', fontSize: 13, marginTop: 4 }}>{error}</div>
      )}
    </div>
  );
}

function StockBadge({ part }) {
  if (isEmpty(part)) {
    return (
      <span className="badge" style={{ background: '#ff4d4f', color: '#fff' }}>
        Hết hàng
      </span>
    );
  }
  if (isLow(part)) {
    return (
      <span className="badge" style={{ background: '#ffe58f', color: '#874d00' }}>
        ⚠️ Sắp hết
      </span>
    );
  }
  return <span className="badge badge-completed">Đủ hàng</span>;
}

/* ===================== Modal Thêm mới / Chỉnh sửa (US10) ===================== */

function PartModal({ mode, part, existingCodes, onClose, onSaved }) {
  const isEdit = mode === 'edit';

  const [form, setForm] = useState(() =>
    isEdit
      ? {
          partCode: part.part_code,
          partName: part.part_name,
          unit: part.unit,
          stockQuantity: String(Number(part.stock_quantity)),
          unitPrice: String(Number(part.unit_price)),
          minStock: String(Number(part.min_stock || 0)),
        }
      : {
          partCode: '',
          partName: '',
          unit: '',
          stockQuantity: '0',
          unitPrice: '',
          minStock: '0',
        }
  );
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  function validate() {
    const next = {};
    const code = form.partCode.trim();
    const name = form.partName.trim();
    const unit = form.unit.trim();

    if (!isEdit) {
      if (!code) next.partCode = 'Vui lòng nhập mã phụ tùng.';
      else if (code.length > 50) next.partCode = 'Mã phụ tùng tối đa 50 ký tự.';
      else if (existingCodes.includes(code.toLowerCase())) next.partCode = 'Mã phụ tùng đã tồn tại.';

      if (!unit) next.unit = 'Vui lòng nhập đơn vị tính.';
      else if (unit.length > 30) next.unit = 'Đơn vị tính tối đa 30 ký tự.';

      if (!isNonNegInt(form.stockQuantity)) {
        next.stockQuantity = 'Số lượng ban đầu phải là số nguyên từ 0 trở lên.';
      }
    }

    if (!name) next.partName = 'Vui lòng nhập tên phụ tùng.';
    else if (name.length > 255) next.partName = 'Tên phụ tùng tối đa 255 ký tự.';

    if (!isMoney(form.unitPrice)) {
      next.unitPrice = 'Đơn giá phải là số không âm (tối đa 2 chữ số thập phân).';
    }
    if (!isNonNegInt(form.minStock)) {
      next.minStock = 'Ngưỡng tồn tối thiểu phải là số nguyên từ 0 trở lên.';
    }
    return next;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError('');
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      if (isEdit) {
        await api.put(`/spare-parts/${part.id}`, {
          partName: form.partName.trim(),
          unitPrice: Number(form.unitPrice),
          minStock: Number(form.minStock),
        });
        onSaved(`Đã cập nhật phụ tùng "${form.partName.trim()}".`);
      } else {
        await api.post('/spare-parts', {
          partCode: form.partCode.trim(),
          partName: form.partName.trim(),
          unit: form.unit.trim(),
          stockQuantity: Number(form.stockQuantity),
          unitPrice: Number(form.unitPrice),
          minStock: Number(form.minStock),
        });
        onSaved(`Đã thêm phụ tùng "${form.partName.trim()}".`);
      }
    } catch (err) {
      setServerError(
        errorText(err, isEdit ? 'Không cập nhật được phụ tùng.' : 'Không thêm được phụ tùng.')
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-panel" role="dialog" aria-modal="true">
        <div className="modal-header">
          <h2>{isEdit ? 'Chỉnh sửa phụ tùng' : 'Thêm mới phụ tùng'}</h2>
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={submitting}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {serverError && <div className="alert alert-error">{serverError}</div>}

          <Field label="Mã phụ tùng" error={errors.partCode}>
            <input
              className="form-control"
              value={form.partCode}
              onChange={set('partCode')}
              disabled={isEdit}
              placeholder="VD: OIL-FILTER-002"
            />
          </Field>

          <Field label="Tên phụ tùng" error={errors.partName}>
            <input
              className="form-control"
              value={form.partName}
              onChange={set('partName')}
              placeholder="VD: Lọc nhớt Toyota"
            />
          </Field>

          <Field label="Đơn vị tính" error={errors.unit}>
            <input
              className="form-control"
              value={form.unit}
              onChange={set('unit')}
              disabled={isEdit}
              placeholder="VD: Cái, Bộ, Lít"
            />
          </Field>

          <Field
            label={isEdit ? 'Tồn kho hiện tại (đổi bằng chức năng Nhập kho)' : 'Số lượng ban đầu'}
            error={errors.stockQuantity}
          >
            <input
              className="form-control"
              inputMode="numeric"
              value={form.stockQuantity}
              onChange={set('stockQuantity')}
              disabled={isEdit}
            />
          </Field>

          <Field label="Đơn giá (đ)" error={errors.unitPrice}>
            <input
              className="form-control"
              inputMode="decimal"
              value={form.unitPrice}
              onChange={set('unitPrice')}
              placeholder="VD: 450000"
            />
          </Field>

          <Field label="Ngưỡng tồn tối thiểu" error={errors.minStock}>
            <input
              className="form-control"
              inputMode="numeric"
              value={form.minStock}
              onChange={set('minStock')}
            />
          </Field>

          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={submitting}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ===================== Modal Nhập kho (US11) ===================== */

function ImportModal({ part, onClose, onSaved }) {
  const [quantity, setQuantity] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!isPositiveInt(quantity)) {
      setError('Số lượng nhập phải là số nguyên dương (lớn hơn 0).');
      return;
    }

    setSubmitting(true);
    try {
<<<<<<< Updated upstream
      await api.post(`/spare-parts/${part.id}/import`, { quantity: Number(quantity) });
      onSaved(`Đã nhập ${quantity} ${part.unit} cho "${part.part_name}".`);
=======
      await api.post(`/spare-parts/${usageForm.partId}/deduct`, {
        repairJobId: Number(usageForm.repairJobId),
        quantity: Number(usageForm.quantity)
      });
      setNotice(`Đã ghi nhận phụ tùng cho Phiếu #${usageForm.repairJobId} thành công!`);
      setUsageForm({ repairJobId: '', partId: '', quantity: 1 });
      setReload((n) => n + 1);
>>>>>>> Stashed changes
    } catch (err) {
      setError(errorText(err, 'Không nhập kho được.'));
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-panel" role="dialog" aria-modal="true">
        <div className="modal-header">
          <h2>Nhập hàng vào kho</h2>
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={submitting}>
            ✕
          </button>
        </div>

        <p style={{ marginBottom: 16 }}>
          <strong>{part.part_name}</strong> ({part.part_code}) — tồn hiện tại:{' '}
          <strong>
            {formatQty(part.stock_quantity)} {part.unit}
          </strong>
        </p>

        <form onSubmit={handleSubmit} noValidate>
          {error && <div className="alert alert-error">{error}</div>}

          <Field label="Số lượng nhập">
            <input
              className="form-control"
              inputMode="numeric"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="VD: 10"
              autoFocus
            />
          </Field>

          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={submitting}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Đang nhập...' : 'Nhập kho'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ===================== Form ghi nhận sử dụng phụ tùng (US11) ===================== */

function UsageForm({ parts, onDone }) {
  const [form, setForm] = useState({ repairJobId: '', partId: '', quantity: '1' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!isPositiveInt(form.repairJobId)) {
      setError('Mã phiếu sửa chữa phải là số nguyên dương.');
      return;
    }
    if (!form.partId) {
      setError('Vui lòng chọn phụ tùng.');
      return;
    }
    if (!isPositiveInt(form.quantity)) {
      setError('Số lượng phải là số nguyên dương (lớn hơn 0).');
      return;
    }

    const part = parts.find((p) => String(p.id) === String(form.partId));
    setSubmitting(true);
    try {
      await api.post(`/spare-parts/${form.partId}/deduct`, {
        repairJobId: Number(form.repairJobId),
        quantity: Number(form.quantity),
      });
      onDone(
        `Đã ghi nhận ${form.quantity} ${part?.unit || ''} "${part?.part_name || ''}" cho phiếu #${form.repairJobId}.`
      );
      setForm({ repairJobId: '', partId: '', quantity: '1' });
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message;
      if (status === 409) {
        setError(
          `${msg || 'Kho không đủ số lượng yêu cầu'}${
            part ? ` (hiện còn ${formatQty(part.stock_quantity)} ${part.unit}).` : '.'
          }`
        );
      } else if (status === 404) {
        setError(
          msg === 'Không tìm thấy phụ tùng'
            ? msg
            : `Không tìm thấy phiếu sửa chữa #${form.repairJobId}.`
        );
      } else {
        setError(msg || 'Không ghi nhận được phụ tùng.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card" style={{ marginBottom: 20, padding: 15 }}>
      <h3>Ghi nhận phụ tùng sử dụng cho phiếu sửa chữa</h3>
      {error && (
        <div className="alert alert-error" style={{ marginTop: 10 }}>
          {error}
        </div>
      )}
      <form
        onSubmit={handleSubmit}
        noValidate
        style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10, flexWrap: 'wrap' }}
      >
        <input
          className="form-control"
          style={{ width: 200 }}
          inputMode="numeric"
          placeholder="Mã phiếu sửa chữa (VD: 1)"
          value={form.repairJobId}
          onChange={(e) => setForm({ ...form, repairJobId: e.target.value })}
        />
        <select
          className="form-control"
          style={{ width: 280 }}
          value={form.partId}
          onChange={(e) => setForm({ ...form, partId: e.target.value })}
        >
          <option value="">-- Chọn phụ tùng --</option>
          {parts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.part_name} (Tồn: {formatQty(p.stock_quantity)} {p.unit})
            </option>
          ))}
        </select>
        <input
          className="form-control"
          style={{ width: 100 }}
          inputMode="numeric"
          placeholder="Số lượng"
          value={form.quantity}
          onChange={(e) => setForm({ ...form, quantity: e.target.value })}
        />
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Đang ghi nhận...' : 'Ghi nhận sử dụng'}
        </button>
      </form>
    </div>
  );
}

/* ===================== Trang chính ===================== */

export default function InventoryPage() {
  const { user } = useAuth();
  const role = user?.role;
  const canManage = MANAGE_ROLES.includes(role);
  const canCallLowStock = LOW_STOCK_ROLES.includes(role);

  const [parts, setParts] = useState([]);
  const [lowParts, setLowParts] = useState([]);
  const [tab, setTab] = useState('all'); // 'all' | 'low'
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState(null); // { type: 'success' | 'error', text }
  const [modal, setModal] = useState(null); // { type: 'create' | 'edit' | 'import', part? }
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const all = await api.get('/spare-parts');
        if (!active) return;
        setParts(all.data.data || []);

        // Tab "Sắp hết hàng": gọi API low-stock (chỉ với vai trò được phép)
        if (tab === 'low' && canCallLowStock) {
          const low = await api.get('/spare-parts/low-stock');
          if (!active) return;
          setLowParts(low.data.data || []);
        }
        setLoadError('');
      } catch (err) {
        if (active) setLoadError(errorText(err, 'Không tải được dữ liệu kho phụ tùng.'));
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [reload, tab, canCallLowStock]);

  function handleDone(message) {
    setModal(null);
    setNotice({ type: 'success', text: message });
    setReload((n) => n + 1);
  }

  const allLow = parts.filter(isLow);
  const visibleParts = tab === 'low' ? (canCallLowStock ? lowParts : allLow) : parts;
  const existingCodes = parts.map((p) => String(p.part_code).toLowerCase());
  const columnCount = canManage ? 8 : 7;

  return (
    <div style={{ padding: '20px' }}>
      <div className="page-header">
        <h1>Kho phụ tùng & Vật tư</h1>
        {canManage && (
          <button className="btn btn-primary" onClick={() => setModal({ type: 'create' })}>
            + Thêm phụ tùng
          </button>
        )}
      </div>

      {notice && (
        <div className={`alert ${notice.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          {notice.text}
        </div>
      )}
      {loadError && <div className="alert alert-error">{loadError}</div>}

      {/* Cảnh báo tồn kho thấp (US12) */}
      {allLow.length > 0 && (
        <div
          style={{
            marginBottom: 20,
            padding: 15,
            background: '#fff2f0',
            border: '1px solid #ff4d4f',
            borderRadius: 8,
          }}
        >
          <h3 style={{ margin: '0 0 10px 0', color: '#cf1322' }}>
            ⚠️ Cảnh báo phụ tùng sắp hết kho ({allLow.length})
          </h3>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {allLow.map((p) => (
              <span
                key={p.id}
                className="badge"
                style={{
                  padding: '6px 12px',
                  background: isEmpty(p) ? '#ff4d4f' : '#ffe58f',
                  color: isEmpty(p) ? '#fff' : '#874d00',
                }}
              >
                {p.part_name} (Còn: {formatQty(p.stock_quantity)} {p.unit})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Ghi nhận sử dụng phụ tùng (US11) */}
      {canManage && <UsageForm parts={parts} onDone={handleDone} />}

      {/* Tab lọc (US12) */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        <button
          className={`btn ${tab === 'all' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setTab('all')}
        >
          Tất cả phụ tùng ({parts.length})
        </button>
        <button
          className={`btn ${tab === 'low' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setTab('low')}
        >
          ⚠️ Sắp hết hàng ({allLow.length})
        </button>
      </div>

      {/* Bảng danh sách */}
      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>MÃ HÀNG</th>
                <th>TÊN PHỤ TÙNG</th>
                <th>ĐƠN VỊ</th>
                <th>TỒN KHO</th>
                <th>TỒN TỐI THIỂU</th>
                <th>ĐƠN GIÁ</th>
                <th>TRẠNG THÁI</th>
                {canManage && <th>THAO TÁC</th>}
              </tr>
            </thead>
            <tbody>
              {visibleParts.map((p) => (
                <tr key={p.id} style={isLow(p) ? { background: '#fff8e6' } : undefined}>
                  <td>{p.part_code}</td>
                  <td>{p.part_name}</td>
                  <td>{p.unit}</td>
                  <td>
                    <strong>{formatQty(p.stock_quantity)}</strong>
                  </td>
                  <td>{formatQty(p.min_stock)}</td>
                  <td>{formatMoney(p.unit_price)}</td>
                  <td>
                    <StockBadge part={p} />
                  </td>
                  {canManage && (
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn btn-outline"
                          onClick={() => setModal({ type: 'edit', part: p })}
                        >
                          Sửa
                        </button>
                        <button
                          className="btn btn-outline"
                          onClick={() => setModal({ type: 'import', part: p })}
                        >
                          Nhập kho
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {!visibleParts.length && (
                <tr>
                  <td colSpan={columnCount}>
                    {loading
                      ? 'Đang tải dữ liệu...'
                      : tab === 'low'
                        ? 'Không có phụ tùng nào sắp hết hàng.'
                        : 'Kho trống.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Các modal */}
      {modal?.type === 'create' && (
        <PartModal
          mode="create"
          existingCodes={existingCodes}
          onClose={() => setModal(null)}
          onSaved={handleDone}
        />
      )}
      {modal?.type === 'edit' && (
        <PartModal
          mode="edit"
          part={modal.part}
          existingCodes={existingCodes}
          onClose={() => setModal(null)}
          onSaved={handleDone}
        />
      )}
      {modal?.type === 'import' && (
        <ImportModal part={modal.part} onClose={() => setModal(null)} onSaved={handleDone} />
      )}
    </div>
  );
}
