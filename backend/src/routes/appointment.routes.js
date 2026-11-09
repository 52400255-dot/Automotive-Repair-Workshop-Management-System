const express = require('express');
const controller = require('../controllers/appointment.controller');
const { authenticateToken } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validateIntParam } = require('../middleware/validate');

const router = express.Router();
router.use(authenticateToken);
router.param('id', (req, res, next) => validateIntParam('id')(req, res, next));

router.get('/mine', authorize('customer'), controller.mine);
router.post('/', authorize('customer'), controller.create);
router.get('/', authorize('receptionist', 'service_manager', 'admin'), controller.queue);
router.put('/:id/decision', authorize('receptionist', 'service_manager', 'admin'), controller.decide);
router.post('/:id/customer-decision', authorize('customer'), controller.customerDecision);
router.post('/:id/cancel', authorize('customer'), controller.cancel);
router.post('/:id/check-in', authorize('receptionist'), controller.checkIn);

module.exports = router;
