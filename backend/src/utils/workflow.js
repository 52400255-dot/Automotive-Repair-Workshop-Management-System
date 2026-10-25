/**
 * workflow.js — Các hàm thuần (pure functions) định nghĩa luật chuyển đổi trạng thái
 * và xác thực dữ liệu cho luồng sửa chữa (US04, US06, US07, US08).
 * Tách riêng để viết Unit Test tự động (US18).
 */

const ALLOWED_TRANSITIONS = {
  pending: ['diagnosing', 'cancelled'],
  diagnosing: ['estimated', 'cancelled'],
  estimated: ['approved', 'cancelled'],
  approved: ['in_repair', 'cancelled'],
  in_repair: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

/**
 * Kiểm tra xem việc chuyển từ trạng thái hiện tại sang trạng thái mới có hợp lệ không.
 * @param {string} currentStatus
 * @param {string} nextStatus
 * @returns {boolean}
 */
function isValidStatusTransition(currentStatus, nextStatus) {
  if (!Object.hasOwn(ALLOWED_TRANSITIONS, currentStatus) || !Object.hasOwn(ALLOWED_TRANSITIONS, nextStatus)) return false;
  if (currentStatus === nextStatus) return true;
  const allowed = ALLOWED_TRANSITIONS[currentStatus];
  return Boolean(allowed && allowed.includes(nextStatus));
}

/**
 * Chuẩn hóa danh sách hạng mục dịch vụ đầu vào khi tiếp nhận xe.
 * Chấp nhận mảng số nguyên [1, 2] hoặc mảng đối tượng [{ serviceId, quantity }].
 * @param {any} serviceItems
 * @returns {Array<{ serviceId: number, quantity: number }>}
 */
function isPositiveId(value) {
  return (typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value)))
    && Number.isSafeInteger(Number(value)) && Number(value) > 0;
}

function normalizeServiceItems(items) {
  if (items === undefined) return [];
  const invalid = () => { throw Object.assign(new Error('Danh sách dịch vụ hoặc số lượng không hợp lệ'), { statusCode: 400 }); };
  if (!Array.isArray(items)) return invalid();
  return items.map(item => {
    const object = item !== null && typeof item === 'object' && !Array.isArray(item);
    const id = object ? (item.serviceId ?? item.service_id ?? item.id) : item;
    const quantity = object && item.quantity !== undefined ? item.quantity : 1;
    if (!isPositiveId(id) || !['number', 'string'].includes(typeof quantity)
      || !Number.isFinite(Number(quantity)) || Number(quantity) <= 0
      || Number(quantity) > 9999999999.99) return invalid();
    return { serviceId: Number(id), quantity: Number(quantity) };
  });
}

/**
 * Kiểm tra dữ liệu tiếp nhận xe (US04).
 * @param {{ vehicleId: any, customerRequest: string }} data
 * @returns {{ valid: boolean, error?: string }}
 */
function validateReceptionData(data) {
  if (!data) return { valid: false, error: 'Dữ liệu không được để trống' };
  if (!isPositiveId(data.vehicleId)) {
    return { valid: false, error: 'Mã phương tiện (vehicleId) không hợp lệ' };
  }
  if (typeof data.customerRequest !== 'string' || !data.customerRequest.trim()) {
    return { valid: false, error: 'Mô tả yêu cầu khách hàng không được để trống' };
  }
  return { valid: true };
}

/**
 * Kiểm tra dữ liệu chẩn đoán kỹ thuật (US06).
 * @param {{ diagnosisResult: string, repairSuggestion?: string }} data
 * @returns {{ valid: boolean, error?: string }}
 */
function validateDiagnosisData(data) {
  if (data?.repairSuggestion != null && typeof data.repairSuggestion !== 'string') return { valid: false, error: 'Đề xuất sửa chữa phải là chuỗi' };
  if (!data || typeof data.diagnosisResult !== 'string' || !data.diagnosisResult.trim()) {
    return { valid: false, error: 'Kết quả chẩn đoán kỹ thuật không được để trống' };
  }
  return { valid: true };
}

/**
 * Kiểm tra và chuẩn hóa payload báo giá theo giới hạn của schema PostgreSQL.
 * @param {{ repairJobId: any, items: any }} data
 * @returns {{ valid: boolean, error?: string, items?: Array, totalAmount?: number }}
 */
function validateEstimateData(data) {
  const invalid = (error) => ({ valid: false, error });
  if (!data || !isPositiveId(data.repairJobId)) {
    return invalid('Mã phiếu sửa chữa (repairJobId) không hợp lệ');
  }
  if (!Array.isArray(data.items) || data.items.length === 0) {
    return invalid('Báo giá phải có ít nhất một hạng mục');
  }

  const maxQuantity = 9999999999.99; // NUMERIC(12,2)
  const maxAmount = 999999999999.99; // NUMERIC(14,2)
  const maxAmountCents = 99999999999999;
  let totalCents = 0;
  const items = [];

  for (const item of data.items) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return invalid('Hạng mục báo giá không hợp lệ');
    }
    const { itemType, description } = item;
    const quantity = item.quantity;
    const unitPrice = item.unitPrice ?? item.unit_price;
    const validNumber = (value) => (typeof value === 'number'
      || (typeof value === 'string' && value.trim() !== '')) && Number.isFinite(Number(value));

    if (!['labor', 'part', 'other'].includes(itemType)) {
      return invalid('Loại hạng mục báo giá không hợp lệ');
    }
    if (typeof description !== 'string' || !description.trim() || description.trim().length > 500) {
      return invalid('Mô tả hạng mục phải có từ 1 đến 500 ký tự');
    }
    if (!validNumber(quantity) || Number(quantity) <= 0 || Number(quantity) > maxQuantity) {
      return invalid('Số lượng hạng mục phải lớn hơn 0 và không vượt giới hạn cho phép');
    }
    if (!validNumber(unitPrice) || Number(unitPrice) < 0 || Number(unitPrice) > maxAmount) {
      return invalid('Đơn giá phải là số không âm và không vượt giới hạn cho phép');
    }

    // Chuẩn hóa hai cột NUMERIC(...,2) trước khi tính tổng để số lưu và số báo giá khớp nhau.
    const normalizedQuantity = Math.round(Number(quantity) * 100) / 100;
    const normalizedUnitPrice = Math.round(Number(unitPrice) * 100) / 100;
    const lineCents = Math.round(normalizedQuantity * normalizedUnitPrice * 100);
    if (!Number.isSafeInteger(lineCents) || lineCents > maxAmountCents) {
      return invalid('Thành tiền hạng mục vượt giới hạn cho phép');
    }
    totalCents += lineCents;
    if (!Number.isSafeInteger(totalCents) || totalCents > maxAmountCents) {
      return invalid('Tổng báo giá vượt giới hạn cho phép');
    }
    items.push({
      itemType,
      description: description.trim(),
      quantity: normalizedQuantity,
      unitPrice: normalizedUnitPrice,
    });
  }

  return { valid: true, items, totalAmount: totalCents / 100 };
}

module.exports = {
  isPositiveId,
  isValidStatusTransition,
  normalizeServiceItems,
  validateReceptionData,
  validateDiagnosisData,
  validateEstimateData,
};
