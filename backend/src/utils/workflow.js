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
  if (!currentStatus || !nextStatus) return false;
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
function normalizeServiceItems(serviceItems) {
  if (!Array.isArray(serviceItems)) return [];
  return serviceItems
    .map((item) => {
      if (typeof item === 'number' || typeof item === 'string') {
        const id = Number(item);
        return id > 0 ? { serviceId: id, quantity: 1 } : null;
      }
      if (item && typeof item === 'object') {
        const id = Number(item.serviceId !== undefined ? item.serviceId : (item.service_id !== undefined ? item.service_id : item.id));
        const qty = item.quantity !== undefined ? Number(item.quantity) : 1;
        return id > 0 && qty > 0 ? { serviceId: id, quantity: qty } : null;
      }
      return null;
    })
    .filter(Boolean);
}

/**
 * Kiểm tra dữ liệu tiếp nhận xe (US04).
 * @param {{ vehicleId: any, customerRequest: string }} data
 * @returns {{ valid: boolean, error?: string }}
 */
function validateReceptionData(data) {
  if (!data) return { valid: false, error: 'Dữ liệu không được để trống' };
  const vId = Number(data.vehicleId);
  if (!vId || vId <= 0 || Number.isNaN(vId)) {
    return { valid: false, error: 'Mã phương tiện (vehicleId) không hợp lệ' };
  }
  if (!data.customerRequest || !data.customerRequest.trim()) {
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
  if (!data || !data.diagnosisResult || !data.diagnosisResult.trim()) {
    return { valid: false, error: 'Kết quả chẩn đoán kỹ thuật không được để trống' };
  }
  return { valid: true };
}

module.exports = {
  isValidStatusTransition,
  normalizeServiceItems,
  validateReceptionData,
  validateDiagnosisData,
};
