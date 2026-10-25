/**
 * customer.routes — /api/v1/customers
 * Phân quyền: Receptionist/Admin được sửa, các role khác chỉ xem
 */
const express = require('express');
const router = express.Router();
const controller = require('../controllers/customer.controller');
const { authenticateToken } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

const { validateIntParam, validateEntity } = require('../middleware/validate');

router.use(authenticateToken);
router.param('id', (req, res, next) => validateIntParam('id')(req, res, next));

router.get('/me', authorize('customer'), controller.getMine);
router.get('/me/vehicles', authorize('customer'), controller.getMyVehicles);
router.get('/', authorize('receptionist', 'service_manager', 'admin'), controller.list);
router.get('/:id', authorize('receptionist', 'service_manager', 'admin'), controller.getById);
router.get('/:id/vehicles', authorize('receptionist', 'service_manager', 'admin'), controller.getVehicles);

router.post('/', authorize('receptionist', 'admin'), validateEntity('customer'), controller.create);
router.put('/:id', authorize('receptionist', 'admin'), validateEntity('customer', true), controller.update);
router.delete(
  '/:id',
  authorize('receptionist', 'admin'),
  controller.remove
);

module.exports = router;
