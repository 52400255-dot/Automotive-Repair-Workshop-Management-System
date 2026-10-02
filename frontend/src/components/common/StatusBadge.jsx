/**
 * StatusBadge — Badge màu hiển thị trạng thái phiếu sửa chữa/báo giá/hóa đơn.
 */
const STATUS_MAP = {
  pending: { label: 'Cho xu ly', cls: 'badge-pending' },
  diagnosing: { label: 'Dang chan doan', cls: 'badge-progress' },
  estimated: { label: 'Cho bao gia', cls: 'badge-progress' },
  approved: { label: 'Da duyet', cls: 'badge-progress' },
  in_repair: { label: 'Dang sua', cls: 'badge-progress' },
  completed: { label: 'Hoan thanh', cls: 'badge-completed' },
  cancelled: { label: 'Da huy', cls: 'badge-cancelled' },
  sent: { label: 'Da gui', cls: 'badge-progress' },
  rejected: { label: 'Tu choi', cls: 'badge-cancelled' },
  issued: { label: 'Da phat hanh', cls: 'badge-progress' },
  paid: { label: 'Da thanh toan', cls: 'badge-completed' },
};

export default function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || { label: status, cls: 'badge-pending' };
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}
