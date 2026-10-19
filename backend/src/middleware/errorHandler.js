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

  if (err.code === '23503') {
    return res.status(req.method === 'DELETE' ? 409 : 404).json({ success: false,
      message: req.method === 'DELETE' ? 'Dữ liệu đang được tham chiếu, không thể xóa' : 'Dữ liệu tham chiếu không tồn tại' });
  }
  if (['23502', '23514', '22P02', '22003', '22001'].includes(err.code)) {
    return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ hoặc vượt giới hạn' });
  }
  if (err.code === 'P0001' && /^service_id .* does not exist$/.test(err.message)) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy dịch vụ' });
  }

  // ── Lỗi chung — trả về 500 Internal Server Error
  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    message: err.message || 'Lỗi máy chủ nội bộ (Internal server error)',
  });
}

module.exports = { errorHandler };
