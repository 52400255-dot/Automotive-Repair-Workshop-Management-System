/**
 * vehicle.routes — /api/v1/vehicles
 */
const express = require('express');
const router = express.Router();
const controller = require('../controllers/vehicle.controller');
const { authenticateToken } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validateIntParam, validateEntity } = require('../middleware/validate');

const repairJobController = require('../controllers/repairJob.controller');

router.use(authenticateToken);
router.param('id', (req, res, next) => validateIntParam('id')(req, res, next));

router.get('/', authorize('receptionist', 'service_manager', 'admin'), controller.list);
router.get('/:id', authorize('receptionist', 'service_manager', 'admin'), controller.getById);
router.get('/:id/repair-history', authorize('customer', 'receptionist', 'service_manager', 'admin'), validateIntParam('id'), controller.repairHistory);

// Tiếp nhận xe (US04 alias: POST /vehicles/receive)
router.post('/receive', authorize('receptionist'), repairJobController.create);
router.post('/:id/receive', authorize('receptionist'), (req, res, next) => {
  req.body = req.body || {};
  req.body.vehicleId = req.params.id;
  return repairJobController.create(req, res, next);
});

router.post('/', authorize('receptionist', 'admin'), validateEntity('vehicle'), controller.create);
router.put('/:id', authorize('receptionist', 'admin'), validateEntity('vehicle', true), controller.update);
router.delete(
  '/:id',
  authorize('receptionist', 'admin'),
  controller.remove
);
module.exports = router;
