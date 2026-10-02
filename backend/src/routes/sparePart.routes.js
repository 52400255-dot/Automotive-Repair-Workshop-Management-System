/**
 * sparePart.routes — /api/v1/spare-parts
 */
const express = require('express');
const router = express.Router();
const controller = require('../controllers/sparePart.controller');
const { authenticateToken } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticateToken);

router.get('/', controller.list);
router.get('/low-stock', authorize('warehouse_staff', 'service_manager', 'admin'), controller.lowStock);
router.get('/:id', controller.getById);

router.post('/', authorize('warehouse_staff', 'admin'), controller.create);
router.put('/:id', authorize('warehouse_staff', 'admin'), controller.update);

// Thợ máy ghi nhận phụ tùng đã dùng → tự trừ kho
router.post('/:id/deduct', authorize('mechanic'), controller.deduct);
// Nhân viên kho nhập hàng
router.post('/:id/import', authorize('warehouse_staff'), controller.importStock);

module.exports = router;
