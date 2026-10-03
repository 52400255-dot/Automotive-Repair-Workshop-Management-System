/**
 * vehicle.controller — CRUD xe + lịch sử sửa chữa
 */
const vehicleService = require('../services/vehicle.service');

async function list(req, res, next) {
  try { res.json({ success: true, data: await vehicleService.findAll() }); }
  catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const vehicle = await vehicleService.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ success: false, message: 'Không tìm thấy xe' });
    res.json({ success: true, data: vehicle });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { customerId, licensePlate, brand, model, manufactureYear } = req.body;
    const created = await vehicleService.create({ customerId, licensePlate, brand, model, manufactureYear });
    res.status(201).json({ success: true, data: created });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const updated = await vehicleService.update(req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, message: 'Không tìm thấy xe' });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const deleted = await vehicleService.remove(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Không tìm thấy xe' });
    res.json({ success: true, message: 'Đã xóa xe' });
  } catch (err) { next(err); }
}

async function repairHistory(req, res, next) {
  try { res.json({ success: true, data: await vehicleService.getRepairHistory(req.params.id) }); }
  catch (err) { next(err); }
}

module.exports = { list, getById, create, update, remove, repairHistory };
