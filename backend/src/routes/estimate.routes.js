/**
 * estimate.routes — /api/v1/estimates
 */
const express = require('express');
const router = express.Router();
const controller = require('../controllers/estimate.controller');
const { authenticateToken } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticateToken);

router.get('/my', authorize('customer'), controller.listMine);
router.get('/:id', authorize('customer', 'receptionist', 'service_manager', 'admin'), controller.getById);

// Lễ tân tạo báo giá
router.post('/', authorize('receptionist'), controller.create);

// Khách hàng sở hữu báo giá là người xác nhận hoặc từ chối.
router.put('/:id/approve', authorize('customer'), controller.approve);
router.put('/:id/reject', authorize('customer'), controller.reject);

module.exports = router;
