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

/**
 * validateIntParam — Factory tạo middleware kiểm tra tham số trên URL (req.params)
 * Là số nguyên dương, tránh để lỗi PostgreSQL lọt ra ngoài thành HTTP 500.
 *
 * @param {string} name - Tên tham số, mặc định 'id'
 * @returns {Function} Express middleware
 */
function validateIntParam(name = 'id') {
  return (req, res, next) => {
    const raw = req.params[name];
    if (!require('../utils/workflow').isPositiveId(raw)) {
      return res.status(400).json({
        success: false,
        message: `Tham số '${name}' không hợp lệ (phải là số nguyên dương)`,
        errors: [{ field: name, message: `'${name}' phải là số nguyên dương, nhận được '${raw}'` }],
      });
    }
    next();
  };
}

module.exports = { validate, validateIntParam };

/** Validation for the existing customer/vehicle forms and partial updates. */
function validateEntity(entity, partial = false) {
  const specs = entity === 'customer'
    ? { fullName: 150, phone: 20, email: 255, address: 255 }
    : { licensePlate: 20, brand: 100, model: 100 };
  const required = entity === 'customer' ? ['fullName', 'phone'] : ['customerId', 'licensePlate', 'brand', 'model'];
  return (req, res, next) => {
    const body = req.body;
    const reject = (message) => res.status(400).json({ success: false, message });
    if (!body || typeof body !== 'object' || Array.isArray(body)) return reject('Dữ liệu phải là object');
    for (const field of required) {
      if (!partial && body[field] == null) return reject(`${field} là bắt buộc`);
    }
    for (const [field, max] of Object.entries(specs)) {
      if (!Object.hasOwn(body, field)) continue;
      if (['email', 'address'].includes(field) && body[field] === null) continue;
      if (typeof body[field] !== 'string' || !body[field].trim() || body[field].trim().length > max)
        return reject(`${field} phải là chuỗi có nội dung, tối đa ${max} ký tự`);
      body[field] = body[field].trim();
    }
    for (const field of entity === 'customer' ? ['userId'] : ['customerId']) {
      if (Object.hasOwn(body, field) && !(field === 'userId' && body[field] === null)
        && !require('../utils/workflow').isPositiveId(body[field])) return reject(`${field} không hợp lệ`);
    }
    if (Object.hasOwn(body, 'manufactureYear') && body.manufactureYear !== null
      && (!Number.isInteger(body.manufactureYear) || body.manufactureYear < 1 || body.manufactureYear > 9999))
      return reject('Năm sản xuất phải là số nguyên từ 1 đến 9999');
    next();
  };
}
module.exports.validateEntity = validateEntity;
