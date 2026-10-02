/**
 * repairJob.routes — /api/v1/repair-jobs
 * Luồng chính: tiếp nhận → phân công → chẩn đoán → cập nhật tiến độ
 */
const express = require('express');
const router = express.Router();
const controller = require('../controllers/repairJob.controller');
const { authenticateToken } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticateToken);

router.get('/', authorize('receptionist', 'service_manager', 'admin'), controller.list);
router.get('/my-jobs', authorize('mechanic'), controller.myJobs);
router.get('/:id', controller.getById);

// Lễ tân tiếp nhận xe, tạo phiếu sửa
router.post('/', authorize('receptionist'), controller.create);

// Cập nhật trạng thái (toàn luồng)
router.put('/:id/status', authorize('receptionist', 'service_manager', 'mechanic'), controller.updateStatus);

// Service Manager phân công thợ
router.put('/:id/assign', authorize('service_manager', 'receptionist'), controller.assign);

// Thợ máy ghi nhận chẩn đoán
router.put('/:id/diagnosis', authorize('mechanic'), controller.diagnosis);

module.exports = router;
