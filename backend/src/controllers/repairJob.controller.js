/**
 * repairJob.controller — Luồng tiếp nhận xe, phiếu sửa, phân công, chẩn đoán
 */
const jobService = require('../services/repairJob.service');

async function list(req, res, next) {
  try { res.json({ success: true, data: await jobService.findAll(req.query.status) }); }
  catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const job = await jobService.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu sửa chữa' });
    if (req.user.role === 'mechanic' && !(await jobService.isAssignedToMechanic(req.params.id, req.user.id))) {
      return res.status(403).json({ success: false, message: 'Bạn không được phân công phiếu sửa chữa này' });
    }
    res.json({ success: true, data: job });
  } catch (err) { next(err); }
}

/** Lễ tân tiếp nhận xe → tạo Repair Job kèm hạng mục dịch vụ */
async function create(req, res, next) {
  try {
    const { vehicleId, customerRequest, serviceItems } = req.body || {};
    const created = await jobService.create({
      vehicleId, customerRequest, serviceItems, receptionistId: req.user.id,
    });
    res.status(201).json({ success: true, data: created });
  } catch (err) { next(err); }
}

async function updateStatus(req, res, next) {
  try {
    const updated = await jobService.updateStatus(req.params.id, req.body?.status, req.user);
    if (!updated) return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu sửa chữa' });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const deleted = await jobService.remove(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu sửa chữa' });
    res.json({ success: true, message: 'Đã xóa phiếu sửa chữa', data: deleted });
  } catch (err) { next(err); }
}

/** Service Manager phân công thợ */
async function assign(req, res, next) {
  try {
    const assignment = await jobService.assignMechanic({
      repairJobId: req.params.id,
      mechanicId: req.body?.mechanicId,
      assignedBy: req.user.id,
    });
    res.json({ success: true, data: assignment });
  } catch (err) { next(err); }
}

/** Thợ máy ghi nhận chẩn đoán */
async function diagnosis(req, res, next) {
  try {
    const saved = await jobService.addDiagnosis({
      repairJobId: req.params.id,
      mechanicId: req.user.id,
      diagnosisResult: req.body?.diagnosisResult,
      repairSuggestion: req.body?.repairSuggestion,
    });
    res.status(201).json({ success: true, data: saved });
  } catch (err) { next(err); }
}

/** Xem lịch sử chẩn đoán của một phiếu sửa chữa */
async function diagnosisHistory(req, res, next) {
  try {
    if (req.user.role === 'mechanic' && !(await jobService.isAssignedToMechanic(req.params.id, req.user.id))) {
      return res.status(403).json({ success: false, message: 'Bạn không được phân công phiếu sửa chữa này' });
    }
    const data = await jobService.getDiagnosisHistory(req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

/** Mechanic Task Board — việc của chính thợ đăng nhập */
async function myJobs(req, res, next) {
  try { res.json({ success: true, data: await jobService.getJobsForMechanic(req.user.id, req.query.status) }); }
  catch (err) { next(err); }
}
async function getMechanics(req, res, next) {
  try { res.json({ success: true, data: await jobService.getMechanics() }); }
  catch (err) { next(err); }
}

module.exports = { list, getById, create, updateStatus, remove, assign, diagnosis, myJobs, getMechanics, diagnosisHistory };
