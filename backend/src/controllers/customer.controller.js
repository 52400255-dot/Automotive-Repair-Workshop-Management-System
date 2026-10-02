/**
 * customer.controller — CRUD khách hàng (API tầng REST)
 */
const customerService = require('../services/customer.service');

async function list(req, res, next) {
  try { res.json({ success: true, data: await customerService.findAll() }); }
  catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const customer = await customerService.findById(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Không tìm thấy khách hàng' });
    res.json({ success: true, data: customer });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { userId, fullName, phone, email } = req.body;
    const created = await customerService.create({ userId, fullName, phone, email });
    res.status(201).json({ success: true, data: created });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const updated = await customerService.update(req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, message: 'Không tìm thấy khách hàng' });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const deleted = await customerService.remove(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Không tìm thấy khách hàng' });
    res.json({ success: true, message: 'Đã xóa khách hàng' });
  } catch (err) { next(err); }
}

async function getVehicles(req, res, next) {
  try { res.json({ success: true, data: await customerService.getVehicles(req.params.id) }); }
  catch (err) { next(err); }
}

module.exports = { list, getById, create, update, remove, getVehicles };
