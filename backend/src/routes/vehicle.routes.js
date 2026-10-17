/**
 * vehicle.routes — /api/v1/vehicles
 */
const express = require('express');
const router = express.Router();
const controller = require('../controllers/vehicle.controller');
const { authenticateToken } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validateIntParam } = require('../middleware/validate');

const repairJobController = require('../controllers/repairJob.controller');

router.use(authenticateToken);

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.get('/:id/repair-history', validateIntParam('id'), controller.repairHistory);

// Tiếp nhận xe (US04 alias: POST /vehicles/receive)
router.post('/receive', authorize('receptionist'), repairJobController.create);
router.post('/:id/receive', authorize('receptionist'), (req, res, next) => {
  req.body.vehicleId = req.params.id;
  return repairJobController.create(req, res, next);
});

router.post('/', authorize('receptionist', 'admin'), controller.create);
router.put('/:id', authorize('receptionist', 'admin'), controller.update);
router.delete('/:id', authorize('admin'), controller.remove);
module.exports = router;
