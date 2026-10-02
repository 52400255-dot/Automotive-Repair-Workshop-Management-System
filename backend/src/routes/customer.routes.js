/**
 * customer.routes — /api/v1/customers
 * Phân quyền: Receptionist/Admin được sửa, các role khác chỉ xem
 */
const express = require('express');
const router = express.Router();
const controller = require('../controllers/customer.controller');
const { authenticateToken } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticateToken);

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.get('/:id/vehicles', controller.getVehicles);

router.post('/', authorize('receptionist', 'admin'), controller.create);
router.put('/:id', authorize('receptionist', 'admin'), controller.update);
router.delete('/:id', authorize('admin'), controller.remove);

module.exports = router;
