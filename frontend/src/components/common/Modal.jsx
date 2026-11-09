import { useEffect, useRef } from 'react';

export default function Modal({ children, onClose, labelledBy, className = '' }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;

    if (!dialog.open) dialog.showModal();

    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  function handleCancel(event) {
    event.preventDefault();
    onClose?.();
  }

  return (
    <dialog
      ref={dialogRef}
      className={`modal-panel${className ? ` ${className}` : ''}`}
      aria-modal="true"
      aria-labelledby={labelledBy}
      onCancel={handleCancel}
    >
      {children}
    </dialog>
  );
}
