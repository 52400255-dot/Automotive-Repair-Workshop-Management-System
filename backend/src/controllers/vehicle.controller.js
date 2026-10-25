/**
 * vehicle.controller — CRUD xe + lịch sử sửa chữa
 */
const vehicleService = require('../services/vehicle.service');

/** Nhóm nghiệp vụ được xem lịch sử sửa chữa của mọi xe (User Story US03) */
const HISTORY_STAFF_ROLES = ['receptionist', 'service_manager', 'admin'];

async function list(req, res, next) {
  try { res.json({ success: true, data: await vehicleService.findAll(req.query.search) }); }
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
    const {
      customerId,
      licensePlate,
      brand,
      model,
      manufactureYear,
      odometerKm,
    } = req.body;

    const created = await vehicleService.create({
      customerId,
      licensePlate,
      brand,
      model,
      manufactureYear,
      odometerKm,
    });

    res.status(201).json({
      success: true,
      data: created,
    });
  } catch (err) {
    next(err);
  }
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
  try {
    const { role, id: userId } = req.user;

    const vehicle = await vehicleService.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy xe' });
    }

    // Khách hàng (Customer Portal) chỉ xem được xe của chính mình
    if (role === 'customer') {
      const owns = await vehicleService.isOwnedByUser(req.params.id, userId);
      if (!owns) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền xem lịch sử của xe này' });
      }
    } else if (!HISTORY_STAFF_ROLES.includes(role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${role}' không được xem lịch sử sửa chữa`,
      });
    }

    res.json({ success: true, data: await vehicleService.getRepairHistory(req.params.id) });
  } catch (err) { next(err); }
}

module.exports = { list, getById, create, update, remove, repairHistory };
