/**
 * Middleware kiểm tra dữ liệu đầu vào (Request Body Validation)
 *
 * Cách dùng:
 *   const { validate } = require('../middleware/validate');
 *
 *   // Định nghĩa schema: { tên_trường: { type, required, min, max } }
 *   const createCustomerSchema = {
 *     full_name: { type: 'string', required: true },
 *     phone:     { type: 'string', required: true },
 *     email:     { type: 'string', required: false },
 *   };
 *
 *   router.post('/', validate(createCustomerSchema), controller.create);
 */

/**
 * validate — Factory tạo middleware kiểm tra req.body theo schema
 * @param {object} schema - Đối tượng mô tả các trường cần kiểm tra
 *   Mỗi trường: { type: 'string'|'number'|'boolean'|'object', required: true/false, min, max }
 * @returns {Function} Express middleware
 */
function validate(schema) {
  return (req, res, next) => {
    const errors = [];
    const body = req.body || {};

    for (const [field, rules] of Object.entries(schema)) {
      const value = body[field];

      // ── Kiểm tra trường bắt buộc
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push({
          field,
          message: `'${field}' là bắt buộc (required)`,
        });
        continue; // Không cần kiểm tra thêm nếu thiếu
      }

      // Nếu trường không bắt buộc và không có giá trị → bỏ qua
      if (value === undefined || value === null) {
        continue;
      }

      // ── Kiểm tra kiểu dữ liệu (type)
      if (rules.type && typeof value !== rules.type) {
        errors.push({
          field,
          message: `'${field}' phải có kiểu '${rules.type}', nhận được '${typeof value}'`,
        });
        continue;
      }

      // ── Kiểm tra độ dài tối thiểu (min) — áp dụng cho string và number
      if (rules.min !== undefined) {
        if (typeof value === 'string' && value.length < rules.min) {
          errors.push({
            field,
            message: `'${field}' phải có ít nhất ${rules.min} ký tự`,
          });
        }
        if (typeof value === 'number' && value < rules.min) {
          errors.push({
            field,
            message: `'${field}' phải >= ${rules.min}`,
          });
        }
      }

      // ── Kiểm tra độ dài tối đa (max) — áp dụng cho string và number
      if (rules.max !== undefined) {
        if (typeof value === 'string' && value.length > rules.max) {
          errors.push({
            field,
            message: `'${field}' không được vượt quá ${rules.max} ký tự`,
          });
        }
        if (typeof value === 'number' && value > rules.max) {
          errors.push({
            field,
            message: `'${field}' phải <= ${rules.max}`,
          });
        }
      }
    }

    // Nếu có lỗi → trả về 400 Bad Request kèm chi tiết
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ (Validation failed)',
        errors,
      });
    }

    next();
  };
}

module.exports = { validate };
