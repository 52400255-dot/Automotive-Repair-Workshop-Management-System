const STAGES = ['Tiếp nhận', 'Kiểm tra', 'Sửa chữa', 'Bàn giao'];

const STAGE_BY_STATUS = {
  pending: 0,
  diagnosing: 1,
  estimated: 1,
  approved: 1,
  in_repair: 2,
  completed: 3,
};

export default function WorkshopProgress({ status, compact = false }) {
  const currentStage = STAGE_BY_STATUS[status] ?? -1;
  const completed = status === 'completed';
  const statusText = status === 'cancelled'
    ? 'Phiếu đã hủy'
    : currentStage < 0
      ? 'Chưa có tiến độ'
      : `Đang ở bước ${STAGES[currentStage]}`;

  return (
    <div
      className={`work-progress${compact ? ' work-progress-compact' : ''}`}
      role="img"
      aria-label={`Tiến độ sửa chữa: ${statusText}`}
    >
      <div className="work-progress-bars" aria-hidden="true">
        {STAGES.map((stage, index) => (
          <span
            key={stage}
            className={completed || index < currentStage
              ? 'is-complete'
              : index === currentStage
                ? 'is-current'
                : ''}
          />
        ))}
      </div>
      <ol className="work-progress-labels" aria-hidden="true">
        {STAGES.map((stage, index) => (
          <li
            key={stage}
            className={index === currentStage ? 'is-current' : ''}
          >
            {stage}
          </li>
        ))}
      </ol>
    </div>
  );
}
