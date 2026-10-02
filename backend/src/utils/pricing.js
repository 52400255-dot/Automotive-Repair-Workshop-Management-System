/**
 * pricing.js — Các hàm tính tiền thuần (pure functions), không phụ thuộc DB.
 * Tách riêng để M4 viết unit test dễ dàng (US18: estimate & tax calculations).
 */

/**
 * Tính tổng tiền báo giá từ danh sách hạng mục.
 * @param {Array<{quantity: number|string, unitPrice: number|string}>} items
 * @returns {number} tổng tiền (đã làm tròn 2 chữ số thập phân)
 */
function calculateEstimateTotal(items) {
  if (!Array.isArray(items)) return 0;
  const total = items.reduce(
    (sum, it) => sum + Number(it.quantity) * Number(it.unitPrice), 0
  );
  return round2(total);
}

/**
 * Tính tổng hóa đơn gồm thuế VAT.
 * @param {number|string} subtotal - Tổng trước thuế
 * @param {number} vatRate - Tỷ lệ thuế, ví dụ 0.10 cho 10%
 * @returns {{subtotal: number, tax: number, total: number}}
 */
function calculateInvoiceTotal(subtotal, vatRate = 0.10) {
  const sub = round2(Number(subtotal));
  const tax = round2(sub * vatRate);
  return { subtotal: sub, tax, total: round2(sub + tax) };
}

/**
 * Kiểm tra trừ kho: số tồn hiện có có đủ để xuất không.
 * @returns {boolean} true nếu đủ hàng
 */
function canDeduct(stockQuantity, requestedQuantity) {
  const stock = Number(stockQuantity);
  const requested = Number(requestedQuantity);
  if (Number.isNaN(stock) || Number.isNaN(requested)) return false;
  if (requested <= 0) return false;
  return stock >= requested;
}

/**
 * Tính tồn kho sau khi xuất/nhập.
 * @param {number|string} stockQuantity - Tồn hiện tại
 * @param {number|string} quantity - Số lượng thay đổi (dương)
 * @param {'export'|'import'|'adjustment'} movementType
 * @returns {number} tồn mới; ném lỗi nếu xuất vượt tồn
 */
function applyStockMovement(stockQuantity, quantity, movementType) {
  const stock = Number(stockQuantity);
  const qty = Number(quantity);
  switch (movementType) {
    case 'import':
      return round2(stock + qty);
    case 'export':
      if (!canDeduct(stock, qty)) {
        throw new Error('Kho không đủ số lượng yêu cầu');
      }
      return round2(stock - qty);
    case 'adjustment':
      return round2(qty); // đặt trực tiếp tồn mới
    default:
      throw new Error(`Loại biến động không hợp lệ: ${movementType}`);
  }
}

/** Cảnh báo tồn kho thấp: tồn <= ngưỡng tối thiểu */
function isLowStock(stockQuantity, minStock) {
  return Number(stockQuantity) <= Number(minStock);
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

module.exports = {
  calculateEstimateTotal,
  calculateInvoiceTotal,
  canDeduct,
  applyStockMovement,
  isLowStock,
};
