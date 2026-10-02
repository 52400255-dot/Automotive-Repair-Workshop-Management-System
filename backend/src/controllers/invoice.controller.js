/**
 * invoice.controller — Hóa đơn: xuất, xem, thanh toán
 */
const invoiceService = require('../services/invoice.service');

async function getById(req, res, next) {
  try {
    const invoice = await invoiceService.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Không tìm thấy hóa đơn' });
    res.json({ success: true, data: invoice });
  } catch (err) { next(err); }
}

/** Lễ tân xuất hóa đơn cho phiếu sửa đã hoàn thành */
async function create(req, res, next) {
  try {
    const invoice = await invoiceService.createForJob(req.body.repairJobId);
    res.status(201).json({ success: true, data: invoice });
  } catch (err) { next(err); }
}

async function pay(req, res, next) {
  try {
    const invoice = await invoiceService.markPaid(req.params.id, req.body);
    res.json({ success: true, data: invoice });
  } catch (err) { next(err); }
}

module.exports = { getById, create, pay };
