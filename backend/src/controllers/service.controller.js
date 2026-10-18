/**
 * service.controller — Quản lý danh mục dịch vụ sửa chữa
 */
const serviceService = require('../services/service.service');

async function list(req, res, next) {
  try {
    const services = await serviceService.findAll();
    res.json({ success: true, data: services });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const item = await serviceService.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy dịch vụ' });
    }
    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById };
