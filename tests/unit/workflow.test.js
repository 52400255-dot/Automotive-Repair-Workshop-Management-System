/**
 * workflow.test.js — Unit test cho các quy tắc nghiệp vụ luồng sửa chữa (US18).
 * Chạy bằng: node --test tests/unit/
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const {
  isValidStatusTransition,
  normalizeServiceItems,
  validateReceptionData,
  validateDiagnosisData,
} = require('../../backend/src/utils/workflow');

describe('isValidStatusTransition — Chuyển đổi trạng thái phiếu sửa chữa', () => {
  test('pending có thể chuyển sang diagnosing khi phân công', () => {
    assert.equal(isValidStatusTransition('pending', 'diagnosing'), true);
  });

  test('diagnosing có thể chuyển sang estimated khi lập báo giá', () => {
    assert.equal(isValidStatusTransition('diagnosing', 'estimated'), true);
  });

  test('estimated có thể chuyển sang approved hoặc cancelled', () => {
    assert.equal(isValidStatusTransition('estimated', 'approved'), true);
    assert.equal(isValidStatusTransition('estimated', 'cancelled'), true);
  });

  test('approved có thể chuyển sang in_repair khi thợ bắt đầu sửa', () => {
    assert.equal(isValidStatusTransition('approved', 'in_repair'), true);
  });

  test('in_repair có thể chuyển sang completed', () => {
    assert.equal(isValidStatusTransition('in_repair', 'completed'), true);
  });

  test('các chuyển đổi nhảy cóc hoặc không hợp lệ bị từ chối', () => {
    assert.equal(isValidStatusTransition('pending', 'completed'), false);
    assert.equal(isValidStatusTransition('pending', 'in_repair'), false);
    assert.equal(isValidStatusTransition('completed', 'pending'), false);
    assert.equal(isValidStatusTransition('cancelled', 'in_repair'), false);
  });

  test('cùng một trạng thái thì hợp lệ (idempotent)', () => {
    assert.equal(isValidStatusTransition('pending', 'pending'), true);
    assert.equal(isValidStatusTransition('in_repair', 'in_repair'), true);
  });

  test('trạng thái null hoặc không xác định trả về false', () => {
    assert.equal(isValidStatusTransition(null, 'pending'), false);
    assert.equal(isValidStatusTransition('pending', null), false);
    assert.equal(isValidStatusTransition('unknown', 'pending'), false);
  });
});

describe('normalizeServiceItems — Chuẩn hóa danh mục dịch vụ đầu vào', () => {
  test('chuẩn hóa mảng ID số nguyên thành format service_id + quantity', () => {
    const raw = [1, 2, 5];
    const normalized = normalizeServiceItems(raw);
    assert.deepEqual(normalized, [
      { serviceId: 1, quantity: 1 },
      { serviceId: 2, quantity: 1 },
      { serviceId: 5, quantity: 1 },
    ]);
  });

  test('chuẩn hóa mảng đối tượng { serviceId, quantity }', () => {
    const raw = [
      { serviceId: 10, quantity: 2 },
      { service_id: 11, quantity: 3 },
    ];
    const normalized = normalizeServiceItems(raw);
    assert.deepEqual(normalized, [
      { serviceId: 10, quantity: 2 },
      { serviceId: 11, quantity: 3 },
    ]);
  });

  test('loại bỏ các mục không hợp lệ (id <= 0 hoặc qty <= 0)', () => {
    const raw = [
      { serviceId: 0, quantity: 1 },
      { serviceId: -5, quantity: 1 },
      { serviceId: 3, quantity: 0 },
      'invalid',
      null,
      { serviceId: 7, quantity: 1 },
    ];
    const normalized = normalizeServiceItems(raw);
    assert.deepEqual(normalized, [{ serviceId: 7, quantity: 1 }]);
  });

  test('đầu vào rỗng hoặc null trả về mảng rỗng []', () => {
    assert.deepEqual(normalizeServiceItems([]), []);
    assert.deepEqual(normalizeServiceItems(null), []);
    assert.deepEqual(normalizeServiceItems(undefined), []);
  });
});

describe('validateReceptionData — Xác thực dữ liệu tiếp nhận xe (US04)', () => {
  test('dữ liệu đầy đủ và hợp lệ', () => {
    const res = validateReceptionData({
      vehicleId: 12,
      customerRequest: 'Kiểm tra thắng xe',
    });
    assert.equal(res.valid, true);
  });

  test('vehicleId không hợp lệ trả về lỗi', () => {
    assert.equal(validateReceptionData({ vehicleId: 0, customerRequest: 'OK' }).valid, false);
    assert.equal(validateReceptionData({ vehicleId: -1, customerRequest: 'OK' }).valid, false);
    assert.equal(validateReceptionData({ vehicleId: 'abc', customerRequest: 'OK' }).valid, false);
    assert.equal(validateReceptionData({ vehicleId: null, customerRequest: 'OK' }).valid, false);
  });

  test('customerRequest rỗng trả về lỗi', () => {
    assert.equal(validateReceptionData({ vehicleId: 1, customerRequest: '' }).valid, false);
    assert.equal(validateReceptionData({ vehicleId: 1, customerRequest: '   ' }).valid, false);
  });
});

describe('validateDiagnosisData — Xác thực dữ liệu chẩn đoán kỹ thuật (US06)', () => {
  test('kết quả chẩn đoán hợp lệ', () => {
    const res = validateDiagnosisData({
      diagnosisResult: 'Hỏng bugi',
      repairSuggestion: 'Thay mới',
    });
    assert.equal(res.valid, true);
  });

  test('chẩn đoán không có đề xuất vẫn hợp lệ (đề xuất là tùy chọn)', () => {
    const res = validateDiagnosisData({ diagnosisResult: 'Cần kiểm tra thêm' });
    assert.equal(res.valid, true);
  });

  test('kết quả chẩn đoán rỗng trả về lỗi', () => {
    assert.equal(validateDiagnosisData({ diagnosisResult: '' }).valid, false);
    assert.equal(validateDiagnosisData({ diagnosisResult: '   ' }).valid, false);
    assert.equal(validateDiagnosisData(null).valid, false);
  });
});
