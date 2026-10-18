/**
 * service.routes — /api/v1/services
 * Danh mục dịch vụ: người dùng đã đăng nhập đều có thể xem danh mục
 */
const express = require('express');
const router = express.Router();
const controller = require('../controllers/service.controller');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', controller.list);
router.get('/:id', controller.getById);

module.exports = router;
