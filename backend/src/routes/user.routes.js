/**
 * user.routes — /api/v1/users (US17)
 * Chỉ admin được gọi. Thứ tự: xác thực → phân quyền → kiểm tra id/body → controller.
 */
const express = require('express');
const router = express.Router();
const controller = require('../controllers/user.controller');
const { authenticateToken } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validate, validateIntParam } = require('../middleware/validate');

router.use(authenticateToken);
router.use(authorize('admin'));

router.get('/', controller.list);
router.patch(
  '/:id/role',
  validateIntParam('id'),
  validate({ role: { type: 'string', required: true } }),
  controller.updateRole
);

module.exports = router;