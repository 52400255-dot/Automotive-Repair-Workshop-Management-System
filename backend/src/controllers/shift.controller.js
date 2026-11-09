const shiftService = require('../services/shift.service');

async function open(req, res, next) {
  try {
    const shift = await shiftService.openShift({ ...req.body, userId: req.user.id });
    res.status(201).json({ success: true, data: shift });
  } catch (err) { next(err); }
}

async function current(_req, res, next) {
  try { res.json({ success: true, data: await shiftService.getCurrentShift() }); }
  catch (err) { next(err); }
}

async function transaction(req, res, next) {
  try {
    const data = await shiftService.recordTransaction({ ...req.body, userId: req.user.id, type: 'outflow' });
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
}

async function close(req, res, next) {
  try {
    const data = await shiftService.closeShift({ ...req.body, userId: req.user.id, userRole: req.user.role });
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function history(req, res, next) {
  try { res.json({ success: true, ...await shiftService.getHistory(req.query) }); }
  catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const data = await shiftService.getShiftWithTransactions(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Không tìm thấy ca làm việc' });
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function approveTransaction(req, res, next) {
  try {
    const data = await shiftService.approveTransaction({ transactionId: req.params.transactionId, userId: req.user.id, approved: req.body.approved });
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function settings(req, res, next) {
  try { res.json({ success: true, data: await shiftService.getSettings() }); }
  catch (err) { next(err); }
}

async function updateSettings(req, res, next) {
  try { res.json({ success: true, data: await shiftService.updateSettings({ ...req.body, userId: req.user.id }) }); }
  catch (err) { next(err); }
}

module.exports = { open, current, transaction, close, history, getById, approveTransaction, settings, updateSettings };
