/**
 * invoice.routes — /api/v1/invoices
 */
const express = require('express');
const router = express.Router();
const controller = require('../controllers/invoice.controller');
const { authenticateToken } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticateToken);

router.get('/:id', controller.getById);

// Lễ tân xuất hóa đơn cho phiếu đã hoàn thành
router.post('/', authorize('receptionist'), controller.create);

// Ghi nhận thanh toán
router.put('/:id/pay', authorize('receptionist', 'admin'), controller.pay);

module.exports = router;
