import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

const money = (value) => `${Number(value || 0).toLocaleString('vi-VN')} đ`;

export default function CashFlowHistoryPage() {
  const [history, setHistory] = useState({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
  const [filters, setFilters] = useState({ fromDate: '', toDate: '' });
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/shifts', { params: { ...filters, page, limit: 20 } });
      setHistory({ data: response.data.data, pagination: response.data.pagination });
    } catch (err) { setError(err.response?.data?.message || 'Không tải được lịch sử ca.'); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => {
    let active = true;
    async function loadHistory() {
      setLoading(true);
      setError('');
      try {
        const response = await api.get('/shifts', { params: { ...filters, page: 1, limit: 20 } });
        if (active) setHistory({ data: response.data.data, pagination: response.data.pagination });
      } catch (err) {
        if (active) setError(err.response?.data?.message || 'Không tải được lịch sử ca.');
      } finally { if (active) setLoading(false); }
    }
    loadHistory();
    return () => { active = false; };
  }, [filters]);

  async function showDetail(shift) {
    setError('');
    try {
      const response = await api.get(`/shifts/${shift.id}`);
      setSelected(response.data.data);
    } catch (err) { setError(err.response?.data?.message || 'Không tải được chi tiết ca.'); }
  }

  return (
    <div className="cash-history-page">
      <div className="page-header"><div><p className="eyebrow">BÁO CÁO TÀI CHÍNH</p><h1>Lịch sử ca & đối soát</h1><p>Tra cứu số liệu chốt ca, chênh lệch và giao dịch theo ngày.</p></div><Link className="btn btn-outline" to="/shifts">Ca hiện tại</Link></div>
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <form className="cash-history-filters" onSubmit={(e) => { e.preventDefault(); load(1); }}>
        <div className="form-group"><label htmlFor="shift-from">Từ ngày</label><input className="form-control" id="shift-from" type="date" value={filters.fromDate} onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })} /></div>
        <div className="form-group"><label htmlFor="shift-to">Đến ngày</label><input className="form-control" id="shift-to" type="date" value={filters.toDate} onChange={(e) => setFilters({ ...filters, toDate: e.target.value })} /></div>
        <button className="btn btn-primary" type="submit" disabled={loading}>Lọc báo cáo</button>
      </form>
      <section className="cash-history-table">
        <div className="table-wrapper"><table><thead><tr><th>Ngày / Ca</th><th>Người mở / chốt</th><th>Tiền gốc</th><th>TM đơn / thu</th><th>CK đơn / thu</th><th>ATM/POS đơn / thu</th><th>Chi TM</th><th>Quỹ lý thuyết</th><th>Kiểm kê</th><th>Nộp két</th><th>Lệch TM</th><th>Lệch CK</th><th>Lệch POS</th><th /></tr></thead><tbody>
          {history.data.map((shift) => <tr key={shift.id}><td>{new Date(`${shift.work_date}T00:00:00`).toLocaleDateString('vi-VN')}<br /><strong>{shift.shift_name === 'ca_1' ? 'Ca 1' : 'Ca 2'}</strong></td><td>{shift.opened_by_name}<br /><small>{shift.closed_by_name || '—'}</small></td><td>{money(shift.opening_cash)}</td><td>{shift.cash_order_count} / {money(shift.total_cash_inflow)}</td><td>{shift.bank_transfer_order_count} / {money(shift.total_bank_inflow)}</td><td>{shift.pos_order_count} / {money(shift.total_pos_inflow)}</td><td>{money(shift.total_cash_outflow)}</td><td>{money(shift.expected_closing_cash)}</td><td>{money(shift.actual_closing_cash)}</td><td>{money(shift.deposited_cash)}</td><td className={Number(shift.cash_difference) === 0 ? 'cash-positive' : 'cash-negative'}>{money(shift.cash_difference)}</td><td className={shift.bank_difference == null || Number(shift.bank_difference) === 0 ? 'cash-positive' : 'cash-negative'}>{shift.bank_difference == null ? '—' : money(shift.bank_difference)}</td><td className={shift.pos_difference == null || Number(shift.pos_difference) === 0 ? 'cash-positive' : 'cash-negative'}>{shift.pos_difference == null ? '—' : money(shift.pos_difference)}</td><td><button className="btn btn-outline" type="button" onClick={() => showDetail(shift)}>Chi tiết</button></td></tr>)}
          {!loading && !history.data.length && <tr><td colSpan="14" className="dashboard-empty-cell">Không có ca đã chốt trong khoảng ngày này.</td></tr>}
          {loading && <tr><td colSpan="14" className="dashboard-empty-cell">Đang tải báo cáo...</td></tr>}
        </tbody></table></div>
        <div className="cash-history-pagination"><span>{history.pagination.total} ca đã chốt</span><div><button className="btn btn-outline" type="button" disabled={loading || history.pagination.page <= 1} onClick={() => load(history.pagination.page - 1)}>Trước</button><span>Trang {history.pagination.page} / {Math.max(1, history.pagination.totalPages)}</span><button className="btn btn-outline" type="button" disabled={loading || history.pagination.page >= history.pagination.totalPages} onClick={() => load(history.pagination.page + 1)}>Tiếp</button></div></div>
      </section>

      {selected && <div className="cash-detail-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><section className="cash-detail-panel" role="dialog" aria-modal="true" aria-labelledby="cash-detail-title"><div className="shift-form-heading"><div><p className="eyebrow">{new Date(`${selected.work_date}T00:00:00`).toLocaleDateString('vi-VN')}</p><h2 id="cash-detail-title">{selected.shift_name === 'ca_1' ? 'Ca 1' : 'Ca 2'} · Báo cáo chốt ca</h2></div><button className="btn btn-outline" type="button" aria-label="Đóng" onClick={() => setSelected(null)}>×</button></div><dl className="cash-detail-summary"><dt>Tiền gốc</dt><dd>{money(selected.opening_cash)}</dd><dt>Tiền mặt · {selected.cash_order_count} đơn</dt><dd>{money(selected.total_cash_inflow)}</dd><dt>Chuyển khoản · {selected.bank_transfer_order_count} đơn</dt><dd>{money(selected.total_bank_inflow)}</dd><dt>Đã đối soát chuyển khoản</dt><dd>{selected.reconciled_bank_inflow == null ? '—' : money(selected.reconciled_bank_inflow)}</dd><dt>Lệch chuyển khoản</dt><dd>{selected.bank_difference == null ? '—' : money(selected.bank_difference)}</dd><dt>ATM/POS · {selected.pos_order_count} đơn</dt><dd>{money(selected.total_pos_inflow)}</dd><dt>Đã đối soát ATM/POS</dt><dd>{selected.reconciled_pos_inflow == null ? '—' : money(selected.reconciled_pos_inflow)}</dd><dt>Lệch ATM/POS</dt><dd>{selected.pos_difference == null ? '—' : money(selected.pos_difference)}</dd><dt>Chi tiền mặt</dt><dd>{money(selected.total_cash_outflow)}</dd><dt>Quỹ lý thuyết</dt><dd>{money(selected.expected_closing_cash)}</dd><dt>Tiền mặt kiểm kê</dt><dd>{money(selected.actual_closing_cash)}</dd><dt>Lệch tiền mặt</dt><dd>{money(selected.cash_difference)}</dd><dt>Nộp két = thu TM − tiền gốc</dt><dd>{money(selected.deposited_cash)}</dd><dt>Ghi chú</dt><dd>{selected.notes || '—'}</dd></dl>{selected.difference_reason && <div className="alert alert-error">Giải trình chênh lệch: {selected.difference_reason}</div>}<h3>Giao dịch trong ca</h3><div className="table-wrapper"><table><thead><tr><th>Thời gian</th><th>Loại</th><th>Nội dung</th><th>Trạng thái</th><th>Số tiền</th></tr></thead><tbody>{selected.transactions.map((item) => <tr key={item.id}><td>{new Date(item.created_at).toLocaleString('vi-VN')}</td><td>{item.transaction_type === 'inflow' ? 'Thu' : 'Chi'}</td><td>{item.description}</td><td>{item.approval_status === 'approved' ? 'Đã duyệt' : item.approval_status === 'rejected' ? 'Từ chối' : 'Chờ duyệt'}</td><td>{money(item.amount)}</td></tr>)}{!selected.transactions.length && <tr><td colSpan="5">Không có giao dịch.</td></tr>}</tbody></table></div></section></div>}
    </div>
  );
}
