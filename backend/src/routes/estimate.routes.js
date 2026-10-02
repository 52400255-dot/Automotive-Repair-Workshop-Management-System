/**
 * estimate.routes — /api/v1/estimates
 */
const express = require('express');
const router = express.Router();
const controller = require('../controllers/estimate.controller');
const { authenticateToken } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticateToken);

router.get('/:id', controller.getById);

// Lễ tân tạo báo giá
router.post('/', authorize('receptionist'), controller.create);

// Khách hàng / lễ tân duyệt hoặc từ chối báo giá
router.put('/:id/approve', authorize('customer', 'receptionist'), controller.approve);
router.put('/:id/reject', authorize('customer', 'receptionist'), controller.reject);

module.exports = router;
