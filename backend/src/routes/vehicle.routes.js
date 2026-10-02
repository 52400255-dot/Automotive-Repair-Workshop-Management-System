/**
 * vehicle.routes — /api/v1/vehicles
 */
const express = require('express');
const router = express.Router();
const controller = require('../controllers/vehicle.controller');
const { authenticateToken } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticateToken);

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.get('/:id/repair-history', controller.repairHistory);

router.post('/', authorize('receptionist', 'admin'), controller.create);
router.put('/:id', authorize('receptionist', 'admin'), controller.update);

module.exports = router;
