/**
 * Middleware xác thực JWT (JWT Authentication Middleware)
 *
 * Kiểm tra token từ header Authorization, giải mã và gắn thông tin
 * người dùng vào req.user để các middleware/controller phía sau sử dụng.
 */
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_change_me';

/**
 * authenticateToken — Xác thực Bearer token
 * Nếu token hợp lệ → gắn { id, role, email } vào req.user
 * Nếu không có token → 401, token sai → 403
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

  try {
    // Giải mã token — payload chứa { id, role, email }
    const decoded = jwt.verify(token, JWT_SECRET);

    // Gắn thông tin user vào request để dùng ở các tầng sau
    req.user = {
      id: decoded.id,
      role: decoded.role,
      email: decoded.email,
    };

    next();
  } catch (err) {
    // Token hết hạn hoặc không hợp lệ
    return res.status(403).json({
      success: false,
      message: 'Token không hợp lệ hoặc đã hết hạn (Invalid or expired token)',
    });
  }
}

module.exports = { authenticateToken };
