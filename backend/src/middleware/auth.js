/**
 * Middleware xác thực JWT (JWT Authentication Middleware)
 *
 * Kiểm tra token từ header Authorization, giải mã và gắn thông tin
 * người dùng vào req.user để các middleware/controller phía sau sử dụng.
 *
 * Buổi 9 — sửa cảnh báo SonarLint S2486 "no-ignored-exceptions":
 *   catch (err) trước đây bắt lỗi nhưng KHÔNG dùng đến err, khiến ba vấn đề
 *   khác nhau bị gộp chung thành một thông báo 403, và next() nằm bên trong
 *   try nên lỗi phát sinh ở middleware phía sau cũng bị bắt nhầm ở đây.
 */
const jwt = require('jsonwebtoken');
const { env } = require('../config/env');

/** Những lỗi token do thư viện jwt ném ra — trả 401; lỗi khác chuyển next(err). */
const JWT_ERROR_NAMES = new Set(['TokenExpiredError', 'JsonWebTokenError', 'NotBeforeError']);

/**
 * authenticateToken — Xác thực Bearer token
 * Không có hoặc không hợp lệ token → 401,
 * lỗi không thuộc về JWT → chuyển cho error handler toàn cục qua next(err).
 */
function authenticateToken(req, res, next) {
  // Lấy header Authorization (dạng "Bearer <token>")
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7) // Cắt bỏ "Bearer " để lấy token
    : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Không tìm thấy token xác thực (Access token required)',
    });
  }

  let decoded;
  try {
    // Giải mã token — payload chứa { id, role, email }
    decoded = jwt.verify(token, env.jwt.secret);
  } catch (err) {
    if (!JWT_ERROR_NAMES.has(err.name)) {
      // Không phải lỗi token: ví dụ thiếu JWT_SECRET, lỗi hệ thống.
      // Trả về cho global error handler để được log và trả 500 đúng bản chất.
      return next(err);
    }
    return res.status(401).json({
      success: false,
      message: err.name === 'TokenExpiredError'
        ? 'Token đã hết hạn, vui lòng đăng nhập lại (Token expired)'
        : 'Token không hợp lệ (Invalid or malformed token)',
    });
  }

  // Gắn thông tin user vào request để dùng ở các tầng sau.
  // next() đặt NGOÀI khối try: lỗi của middleware/controller phía sau
  // không bị biến thành "Token không hợp lệ" và không gây gửi 2 response.
  req.user = {
    id: decoded.id,
    role: decoded.role,
    email: decoded.email,
  };

  return next();
}

module.exports = { authenticateToken, JWT_ERROR_NAMES };
