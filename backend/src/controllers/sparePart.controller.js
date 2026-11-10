/**
 * sparePart.controller — Kho phụ tùng: CRUD, cảnh báo hết hàng, trừ/nhập kho
 */
const partService = require('../services/sparePart.service');

async function list(req, res, next) {
  try { res.json({ success: true, data: await partService.findAll(req.user.role) }); }
  catch (err) { next(err); }
}

async function lowStock(req, res, next) {
  try { res.json({ success: true, data: await partService.findLowStock(req.user.role) }); }
  catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const part = await partService.findById(req.params.id, req.user.role);
    if (!part) return res.status(404).json({ success: false, message: 'Không tìm thấy phụ tùng' });
    res.json({ success: true, data: part });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const created = await partService.create(req.body);
    res.status(201).json({ success: true, data: created });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const updated = await partService.update(req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, message: 'Không tìm thấy phụ tùng' });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
}

/** Thợ máy ghi nhận phụ tùng đã dùng → tự trừ kho */
async function deduct(req, res, next) {
  try {
    const used = await partService.deductForJob({
      repairJobId: req.body.repairJobId,
      sparePartId: req.params.id,
      quantity: req.body.quantity,
      recordedBy: req.user.id,
      recordedByRole: req.user.role,
    });
    res.status(201).json({ success: true, data: used });
  } catch (err) { next(err); }
}

async function reverseUsedPart(req, res, next) {
  try {
    const used = await partService.reverseUsedPart({
      usedPartId: req.params.usedPartId,
      recordedBy: req.user.id,
      recordedByRole: req.user.role,
    });
    res.json({ success: true, data: used });
  } catch (err) { next(err); }
}

/** Nhân viên kho nhập hàng */
async function importStock(req, res, next) {
  try {
    const result = await partService.importStock({
      sparePartId: req.params.id,
      quantity: req.body.quantity,
      purchasePrice: req.body.purchasePrice,
      recordedBy: req.user.id,
    });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

module.exports = { list, lowStock, getById, create, update, deduct, reverseUsedPart, importStock };
