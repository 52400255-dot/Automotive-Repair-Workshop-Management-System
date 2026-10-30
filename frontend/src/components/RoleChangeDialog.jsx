import { useEffect, useRef } from 'react';

const ROLE_LABELS = {
  customer: 'Khách hàng',
  receptionist: 'Lễ tân',
  service_manager: 'Quản lý dịch vụ',
  mechanic: 'Thợ sửa chữa',
  warehouse_staff: 'Nhân viên kho',
  admin: 'Quản trị viên',
};

export default function RoleChangeDialog({
  open,
  targetUser,
  nextRole,
  isSubmitting = false,
  error = '',
  onConfirm,
  onCancel,
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const canConfirm =
    Boolean(targetUser) &&
    Object.hasOwn(ROLE_LABELS, nextRole) &&
    nextRole !== targetUser.role &&
    !isSubmitting;

  function handleSubmit(event) {
    event.preventDefault();

    if (!canConfirm) return;

    onConfirm();
  }

  function handleCancel(event) {
    event.preventDefault();

    if (!isSubmitting) {
      onCancel();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="role-change-title"
      aria-describedby="role-change-description"
      onCancel={handleCancel}
      style={{
        width: 'min(480px, calc(100vw - 32px))',
        maxHeight: '85vh',
        overflowY: 'auto',
        padding: '24px',
        border: '1px solid #d1d5db',
        borderRadius: '12px',
      }}
    >
      <form onSubmit={handleSubmit} aria-busy={isSubmitting}>
        <h2 id="role-change-title">Xác nhận đổi vai trò</h2>

        <p id="role-change-description">
          Thay đổi vai trò sẽ ảnh hưởng đến quyền truy cập
          của người dùng này.
        </p>

        {targetUser && (
          <dl>
            <dt>Họ và tên</dt>
            <dd>{targetUser.full_name}</dd>

            <dt>Email</dt>
            <dd>{targetUser.email}</dd>

            <dt>Vai trò hiện tại</dt>
            <dd>
              {ROLE_LABELS[targetUser.role] ?? targetUser.role}
            </dd>

            <dt>Vai trò mới</dt>
            <dd>{ROLE_LABELS[nextRole] ?? 'Chưa chọn'}</dd>
          </dl>
        )}

        {error && <p role="alert">{error}</p>}

        {isSubmitting && (
          <p role="status">Đang cập nhật vai trò…</p>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            flexWrap: 'wrap',
            gap: '12px',
            marginTop: '24px',
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            autoFocus
          >
            Hủy
          </button>

          <button type="submit" disabled={!canConfirm}>
            {isSubmitting ? 'Đang lưu…' : 'Xác nhận đổi vai trò'}
          </button>
        </div>
      </form>
    </dialog>
  );
}