/**
 * estimate.controller — Báo giá: tạo, xem, duyệt/từ chối
 */
const estimateService = require('../services/estimate.service');

async function getById(req, res, next) {
  try {
    const estimate = await estimateService.findById(req.params.id);
    if (!estimate) return res.status(404).json({ success: false, message: 'Không tìm thấy báo giá' });
    res.json({ success: true, data: estimate });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { repairJobId, items } = req.body;
    const created = await estimateService.create({ repairJobId, items }, req.user.id);
    res.status(201).json({ success: true, data: created });
  } catch (err) { next(err); }
}

async function approve(req, res, next) {
  try { res.json({ success: true, data: await estimateService.approve(req.params.id) }); }
  catch (err) { next(err); }
}

async function reject(req, res, next) {
  try { res.json({ success: true, data: await estimateService.reject(req.params.id) }); }
  catch (err) { next(err); }
}

module.exports = { getById, create, approve, reject };
