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

module.exports = {
  isPositiveId,
  isValidStatusTransition,
  normalizeServiceItems,
  validateReceptionData,
  validateDiagnosisData,
};
