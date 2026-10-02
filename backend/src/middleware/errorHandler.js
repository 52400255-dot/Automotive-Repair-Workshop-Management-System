/**
 * Middleware xử lý lỗi toàn cục (Global Error Handler)
 *
 * Đặt SAU TẤT CẢ các routes trong server.js.
 * Bắt mọi lỗi được throw hoặc gọi next(error) từ controller/service.
 */

/**
 * errorHandler — Xử lý lỗi tập trung
 * @param {Error} err   - Đối tượng lỗi
 * @param {object} req  - Express request
 * @param {object} res  - Express response
 * @param {Function} next - Express next (bắt buộc phải có 4 tham số để Express nhận diện error middleware)
 */
function errorHandler(err, req, res, next) {
  // Log lỗi ra console để debug (trong production nên dùng logger)
  console.error(`[ERROR] ${err.name || 'Error'}: ${err.message}`);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // Xử lý theo loại lỗi cụ thể
  // ── ValidationError: Lỗi dữ liệu đầu vào không hợp lệ
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: err.message || 'Dữ liệu không hợp lệ (Validation failed)',
      errors: err.errors || [],
    });
  }

  // ── UnauthorizedError: Chưa đăng nhập / token sai
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      message: err.message || 'Không được phép truy cập (Unauthorized)',
    });
  }

  // ── ForbiddenError: Không đủ quyền
  if (err.name === 'ForbiddenError') {
    return res.status(403).json({
      success: false,
      message: err.message || 'Không đủ quyền (Forbidden)',
    });
  }

  // ── NotFoundError: Không tìm thấy tài nguyên
  if (err.name === 'NotFoundError') {
    return res.status(404).json({
      success: false,
      message: err.message || 'Không tìm thấy (Not found)',
    });
  }

  // ── PostgreSQL unique constraint violation (mã lỗi 23505)
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      message: 'Dữ liệu đã tồn tại (Duplicate entry)',
      detail: err.detail,
    });
  }

  // ── Lỗi chung — trả về 500 Internal Server Error
  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    message: err.message || 'Lỗi máy chủ nội bộ (Internal server error)',
  });
}

module.exports = { errorHandler };
