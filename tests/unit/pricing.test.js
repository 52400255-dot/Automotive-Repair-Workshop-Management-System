/**
 * pricing.test.js — Unit test cho các hàm tính toán nghiệp vụ (US18).
 * Chạy bằng Node.js built-in test runner:  node --test tests/unit/
 *
 * Phạm vi: tính tổng báo giá, thuế VAT, kiểm tra trừ kho,
 * biến động tồn kho, cảnh báo hết hàng.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const {
  calculateEstimateTotal,
  calculateInvoiceTotal,
  canDeduct,
  applyStockMovement,
  isLowStock,
} = require('../../backend/src/utils/pricing');

describe('calculateEstimateTotal — tổng báo giá', () => {
  test('tính đúng tổng nhiều hạng mục labor + part', () => {
    const items = [
      { itemType: 'labor', description: 'Thay má phanh', quantity: 1, unitPrice: 300000 },
      { itemType: 'part', description: 'Má phanh trước', quantity: 2, unitPrice: 450000 },
      { itemType: 'part', description: 'Nhớt máy', quantity: 4, unitPrice: 120000 },
    ];
    // 300000 + 900000 + 480000 = 1680000
    assert.equal(calculateEstimateTotal(items), 1680000);
  });

  test('quantity nhận dạng chuỗi số từ HTTP payload', () => {
    const items = [{ quantity: '3', unitPrice: '99000' }];
    assert.equal(calculateEstimateTotal(items), 297000);
  });

  test('danh sách rỗng trả về 0', () => {
    assert.equal(calculateEstimateTotal([]), 0);
  });

  test('đầu vào không phải mảng trả về 0', () => {
    assert.equal(calculateEstimateTotal(null), 0);
    assert.equal(calculateEstimateTotal(undefined), 0);
  });

  test('làm tròn 2 chữ số thập phân', () => {
    const items = [{ quantity: 3, unitPrice: 33333.333 }];
    assert.equal(calculateEstimateTotal(items), 100000);
  });
});

describe('calculateInvoiceTotal — hóa đơn + thuế VAT', () => {
  test('VAT 10% mặc định', () => {
    const r = calculateInvoiceTotal(1000000);
    assert.deepEqual(r, { subtotal: 1000000, tax: 100000, total: 1100000 });
  });

  test('thuế 8% khi truyền vatRate', () => {
    const r = calculateInvoiceTotal(500000, 0.08);
    assert.equal(r.tax, 40000);
    assert.equal(r.total, 540000);
  });

  test('subtotal lẻ được làm tròn đúng', () => {
    const r = calculateInvoiceTotal(999999.999, 0.1);
    assert.equal(r.subtotal, 1000000);
    assert.equal(r.total, 1100000);
  });

  test('subtotal bằng 0 → thuế 0, tổng 0', () => {
    const r = calculateInvoiceTotal(0);
    assert.deepEqual(r, { subtotal: 0, tax: 0, total: 0 });
  });

  test('ca biên: số tiền lớn, VAT 10%', () => {
    const r = calculateInvoiceTotal(12345678901, 0.1);
    assert.equal(r.tax, 1234567890.1);
    assert.equal(r.total, 13580246791.1);
  });
});

describe('canDeduct — kiểm tra đủ tồn khi trừ kho', () => {
  test('đủ hàng → true', () => {
    assert.equal(canDeduct(10, 3), true);
  });

  test('vừa đủ → true (biên)', () => {
    assert.equal(canDeduct(5, 5), true);
  });

  test('thiếu hàng → false', () => {
    assert.equal(canDeduct(2, 5), false);
  });

  test('số lượng 0 hoặc âm → false', () => {
    assert.equal(canDeduct(10, 0), false);
    assert.equal(canDeduct(10, -1), false);
  });

  test('giá trị NaN → false', () => {
    assert.equal(canDeduct('abc', 1), false);
    assert.equal(canDeduct(5, null), false);
  });
});

describe('applyStockMovement — biến động tồn kho', () => {
  test('import cộng vào tồn', () => {
    assert.equal(applyStockMovement(10, 5, 'import'), 15);
  });

  test('export trừ đi tồn', () => {
    assert.equal(applyStockMovement(10, 3, 'export'), 7);
  });

  test('export vượt tồn → ném lỗi', () => {
    assert.throws(() => applyStockMovement(2, 5, 'export'), /không đủ/);
  });

  test('adjustment đặt trực tiếp tồn mới', () => {
    assert.equal(applyStockMovement(99, 50, 'adjustment'), 50);
  });

  test('loại biến động không hợp lệ → ném lỗi', () => {
    assert.throws(() => applyStockMovement(10, 1, 'steal'), /không hợp lệ/);
  });

  test('số thập phân làm tròn 2 chữ số', () => {
    assert.equal(applyStockMovement(10.5, 0.25, 'export'), 10.25);
  });
});

describe('isLowStock — cảnh báo tồn kho thấp', () => {
  test('tồn dưới ngưỡng → true', () => {
    assert.equal(isLowStock(1, 5), true);
  });

  test('tồn đúng ngưỡng → true (biên)', () => {
    assert.equal(isLowStock(5, 5), true);
  });

  test('tồn trên ngưỡng → false', () => {
    assert.equal(isLowStock(6, 5), false);
  });
});
