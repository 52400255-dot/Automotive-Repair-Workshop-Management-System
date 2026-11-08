/**
 * invoice.routes — /api/v1/invoices
 */
const express = require('express');
const router = express.Router();
const controller = require('../controllers/invoice.controller');
const { authenticateToken } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validateIntParam } = require('../middleware/validate');

router.use(authenticateToken);

router.get('/my', authorize('customer'), controller.listMine);
router.param('repairJobId', (req, res, next) => validateIntParam('repairJobId')(req, res, next));

router.get('/by-job/:repairJobId', authorize('receptionist', 'admin'), controller.getForJob);

router.get('/:id', authorize('customer', 'receptionist', 'service_manager', 'admin'), controller.getById);

// Lễ tân xuất hóa đơn cho phiếu đã hoàn thành
router.post('/', authorize('receptionist', 'admin'), controller.create);

// Ghi nhận thanh toán
router.put('/:id/pay', authorize('receptionist', 'admin'), controller.pay);

module.exports = router;
