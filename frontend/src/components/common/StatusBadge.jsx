/**
 * StatusBadge — Badge màu hiển thị trạng thái phiếu sửa chữa/báo giá/hóa đơn.
 */
const STATUS_MAP = {
  pending: { label: 'Chờ xử lý', cls: 'badge-pending' },
  diagnosing: { label: 'Đang chẩn đoán', cls: 'badge-progress' },
  estimated: { label: 'Chờ duyệt báo giá', cls: 'badge-progress' },
  approved: { label: 'Đã duyệt', cls: 'badge-progress' },
  in_repair: { label: 'Đang sửa chữa', cls: 'badge-progress' },
  completed: { label: 'Hoàn thành', cls: 'badge-completed' },
  cancelled: { label: 'Đã hủy', cls: 'badge-cancelled' },
  sent: { label: 'Đã gửi', cls: 'badge-progress' },
  rejected: { label: 'Từ chối', cls: 'badge-cancelled' },
  issued: { label: 'Đã phát hành', cls: 'badge-progress' },
  paid: { label: 'Đã thanh toán', cls: 'badge-completed' },
};

export default function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || { label: status, cls: 'badge-pending' };
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}
