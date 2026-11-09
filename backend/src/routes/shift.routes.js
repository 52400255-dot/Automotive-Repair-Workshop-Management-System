const express = require('express');
const controller = require('../controllers/shift.controller');
const { authenticateToken } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validateIntParam } = require('../middleware/validate');

const router = express.Router();
router.use(authenticateToken);
router.param('id', (req, _res, next) => validateIntParam('id')(req, _res, next));
router.param('transactionId', (req, _res, next) => validateIntParam('transactionId')(req, _res, next));
router.param('payableId', (req, _res, next) => validateIntParam('payableId')(req, _res, next));

router.post('/open', authorize('receptionist', 'admin'), controller.open);
router.get('/current', authorize('receptionist', 'service_manager', 'admin'), controller.current);
router.post('/cash-movements', authorize('service_manager', 'admin'), controller.cashMovement);
router.get('/inventory-payables', authorize('service_manager', 'admin'), controller.inventoryPayables);
router.post('/inventory-payables/:payableId/payout', authorize('service_manager', 'admin'), controller.payoutPayable);
router.post('/transactions', authorize('receptionist'), controller.transaction);
router.post('/transactions/:transactionId/decision', authorize('service_manager', 'admin'), controller.approveTransaction);
router.get('/settings', authorize('receptionist', 'service_manager', 'admin'), controller.settings);
router.patch('/settings', authorize('admin'), controller.updateSettings);
router.post('/close', authorize('receptionist', 'admin'), controller.close);
router.get('/', authorize('service_manager', 'admin'), controller.history);
router.get('/:id', authorize('receptionist', 'service_manager', 'admin'), controller.getById);

module.exports = router;
