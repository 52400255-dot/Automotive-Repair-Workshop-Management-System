/**
 * Middleware phân quyền theo vai trò (Role-Based Access Control)
 *
 * Sử dụng sau middleware authenticateToken.
 * Kiểm tra req.user.role có nằm trong danh sách allowedRoles không.
 *
 * Ví dụ sử dụng:
 *   router.delete('/:id', authenticateToken, authorize('admin'), controller.delete);
 */

/**
 * authorize — Tạo middleware kiểm tra vai trò người dùng
 * @param  {...string} allowedRoles - Danh sách role được phép (vd: 'admin', 'mechanic', 'receptionist')
 * @returns {Function} Express middleware
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    // Kiểm tra đã xác thực chưa (phải chạy authenticateToken trước)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Chưa xác thực (Authentication required)',
      });
    }

    // Kiểm tra role có nằm trong danh sách cho phép không
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Bạn không có quyền truy cập (Role '${req.user.role}' is not authorized). Cần một trong: ${allowedRoles.join(', ')}`,
      });
    }

    next();
  };
}

module.exports = { authorize };
