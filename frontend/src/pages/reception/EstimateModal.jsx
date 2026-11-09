import { useEffect, useState } from 'react';
import api from '../../services/api';
import Plate from '../../components/common/Plate';
import RepairOrderCode from '../../components/common/RepairOrderCode';
import Modal from '../../components/common/Modal';

const emptyForm = {
  laborDescription: 'Tiền công sửa chữa',
  laborPrice: '',
  notes: '',
};

function getErrorMessage(error, fallback) {
  return error.response?.data?.message || fallback;
}

export default function EstimateModal({
  job,
  onClose,
  onCreated,
}) {
  const [spareParts, setSpareParts] = useState([]);
  const [partQuantities, setPartQuantities] = useState({});
  const [form, setForm] = useState(emptyForm);
  const [loadingParts, setLoadingParts] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let active = true;

    async function loadSpareParts() {
      setLoadingParts(true);
      setErrorMessage('');

      try {
        const response = await api.get('/spare-parts');

        if (active) {
          setSpareParts(response.data.data || []);
        }
      } catch (error) {
        if (active) {
          setErrorMessage(
            getErrorMessage(
              error,
              'Không tải được danh mục phụ tùng.'
            )
          );
        }
      } finally {
        if (active) {
          setLoadingParts(false);
        }
      }
    }

    loadSpareParts();

    return () => {
      active = false;
    };
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function togglePart(partId) {
    const key = String(partId);

    setPartQuantities((current) => {
      if (Object.hasOwn(current, key)) {
        const next = { ...current };
        delete next[key];
        return next;
      }

      return {
        ...current,
        [key]: '1',
      };
    });
  }

  function changePartQuantity(partId, value) {
    setPartQuantities((current) => ({
      ...current,
      [String(partId)]: value,
    }));
  }

  const selectedParts = Object.entries(partQuantities)
    .map(([partId, quantity]) => {
      const part = spareParts.find(
        (item) => String(item.id) === String(partId)
      );

      if (!part) return null;

      return {
        part,
        quantity: Number(quantity),
      };
    })
    .filter(Boolean);

  const invalidPartQuantity = selectedParts.some(
    (item) =>
      !Number.isFinite(item.quantity) ||
      item.quantity <= 0
  );

  const totalAmount = selectedParts.reduce(
    (total, item) =>
      total +
      item.quantity * Number(item.part.unit_price),
    Number(form.laborPrice || 0)
  );

  async function handleSubmit(event) {
    event.preventDefault();

    if (submitting) return;

    const laborPrice = Number(form.laborPrice);

    if (
      form.laborPrice === '' ||
      !Number.isFinite(laborPrice) ||
      laborPrice < 0
    ) {
      setErrorMessage(
        'Tiền công phải là một số không âm.'
      );
      return;
    }

    if (invalidPartQuantity) {
      setErrorMessage(
        'Số lượng phụ tùng phải lớn hơn 0.'
      );
      return;
    }

    const items = [
      {
        itemType: 'labor',
        description:
          form.laborDescription.trim() ||
          'Tiền công sửa chữa',
        quantity: 1,
        unitPrice: laborPrice,
      },
      ...selectedParts.map(({ part, quantity }) => ({
        itemType: 'part',
        description: part.part_name,
        quantity,
        unitPrice: Number(part.unit_price),
      })),
    ];

    if (form.notes.trim()) {
      items.push({
        itemType: 'other',
        description: `Ghi chú: ${form.notes.trim()}`,
        quantity: 1,
        unitPrice: 0,
      });
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      await api.post('/estimates', {
        repairJobId: job.id,
        items,
      });

      onCreated(job.id);
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, 'Không thể tạo báo giá.')
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal onClose={() => { if (!submitting) onClose(); }} labelledBy="estimate-modal-title">
        <div className="modal-header">
            <h2 id="estimate-modal-title">
            Lập báo giá — <RepairOrderCode id={job.id} />
          </h2>

          <button
            type="button"
            className="btn btn-outline"
            onClick={onClose}
            disabled={submitting}
            aria-label="Đóng"
          >
            ×
          </button>
        </div>

        <div className="estimate-job-context">
          <p>
            <strong>Xe:</strong> <Plate value={job.license_plate} />{' '}
            ({job.brand} {job.model})
          </p>

          <p>
            <strong>Khách hàng:</strong>{' '}
            {job.customer_name}
          </p>

          <p>
            <strong>Yêu cầu:</strong>{' '}
            {job.customer_request}
          </p>
        </div>

        {errorMessage && (
          <div className="alert alert-error" role="alert">
            {errorMessage}
          </div>
        )}

        <form className="estimate-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="labor-description">
              Nội dung tiền công (*)
            </label>

            <input
              id="labor-description"
              name="laborDescription"
              className="form-control"
              value={form.laborDescription}
              onChange={handleChange}
              disabled={submitting}
              maxLength={500}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="labor-price">
              Tiền công (*)
            </label>

            <input
              id="labor-price"
              name="laborPrice"
              type="number"
              className="form-control"
              value={form.laborPrice}
              onChange={handleChange}
              disabled={submitting}
              min="0"
              step="1000"
              placeholder="Ví dụ: 200000"
              required
            />
          </div>

          <div className="form-group">
            <label>Phụ tùng dự kiến</label>

            <div className="estimate-part-picker">
              {loadingParts && (
                <p role="status">
                  Đang tải danh mục phụ tùng...
                </p>
              )}

              {!loadingParts && spareParts.length === 0 && (
                <p>Chưa có phụ tùng trong danh mục.</p>
              )}

              {spareParts.map((part) => {
                const key = String(part.id);
                const selected = Object.hasOwn(
                  partQuantities,
                  key
                );

                return (
                  <div key={part.id} className="estimate-part-row">
                    <label className="estimate-part-choice">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() =>
                          togglePart(part.id)
                        }
                        disabled={submitting}
                      />

                      <span>
                        <strong>{part.part_name}</strong>
                        <br />

                        <small>
                          {Number(
                            part.unit_price
                          ).toLocaleString('vi-VN')}{' '}
                          đ/{part.unit} — Tồn:{' '}
                          {part.stock_quantity}
                        </small>
                      </span>
                    </label>

                    <input
                      type="number"
                      className="form-control"
                      aria-label={
                        `Số lượng ${part.part_name}`
                      }
                      value={partQuantities[key] || ''}
                      onChange={(event) =>
                        changePartQuantity(
                          part.id,
                          event.target.value
                        )
                      }
                      disabled={!selected || submitting}
                      min="0.01"
                      step="0.01"
                      placeholder="SL"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="estimate-notes">
              Ghi chú
            </label>

            <textarea
              id="estimate-notes"
              name="notes"
              className="form-control"
              rows={3}
              value={form.notes}
              onChange={handleChange}
              disabled={submitting}
              maxLength={490}
              placeholder="Ghi chú thêm cho khách hàng..."
            />
          </div>

          <div className="estimate-total-banner">
            Tổng dự kiến:{' '}
            {totalAmount.toLocaleString('vi-VN')} đ
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              disabled={submitting}
            >
              Hủy
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={
                submitting ||
                loadingParts ||
                form.laborPrice === '' ||
                invalidPartQuantity
              }
            >
              {submitting
                ? 'Đang tạo báo giá...'
                : 'Gửi báo giá'}
            </button>
          </div>
        </form>
    </Modal>
  );
}
