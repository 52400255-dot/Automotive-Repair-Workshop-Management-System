/**
 * sparePart.routes — /api/v1/spare-parts
 */
const express = require('express');
const router = express.Router();
const controller = require('../controllers/sparePart.controller');
const { authenticateToken } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validateIntParam } = require('../middleware/validate');

router.use(authenticateToken);
router.param('usedPartId', (req, _res, next) => validateIntParam('usedPartId')(req, _res, next));

router.get('/', controller.list);
router.get('/low-stock', authorize('warehouse_staff', 'service_manager', 'admin'), controller.lowStock);
router.get('/:id', controller.getById);

router.post('/', authorize('warehouse_staff', 'service_manager', 'admin'), controller.create);
router.put('/:id', authorize('warehouse_staff', 'service_manager', 'admin'), controller.update);

// Thợ máy ghi nhận phụ tùng đã dùng → tự trừ kho
router.post('/:id/deduct', authorize('mechanic', 'warehouse_staff', 'admin'), controller.deduct);
router.delete('/usage/:usedPartId', authorize('mechanic', 'warehouse_staff', 'service_manager', 'admin'), controller.reverseUsedPart);
// Nhân viên kho, quản lý dịch vụ hoặc admin nhập hàng
router.post('/:id/import', authorize('warehouse_staff', 'service_manager', 'admin'), controller.importStock);

module.exports = router;
