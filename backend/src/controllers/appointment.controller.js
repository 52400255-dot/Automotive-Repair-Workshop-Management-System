const appointmentService = require('../services/appointment.service');

async function create(req, res, next) {
  try { res.status(201).json({ success: true, data: await appointmentService.create({ ...req.body, userId: req.user.id }) }); }
  catch (err) { next(err); }
}

async function mine(req, res, next) {
  try { res.json({ success: true, data: await appointmentService.listMine(req.user.id) }); }
  catch (err) { next(err); }
}

async function queue(_req, res, next) {
  try { res.json({ success: true, data: await appointmentService.listQueue() }); }
  catch (err) { next(err); }
}

async function decide(req, res, next) {
  try { res.json({ success: true, data: await appointmentService.decide({ ...req.body, id: req.params.id, userId: req.user.id, userRole: req.user.role }) }); }
  catch (err) { next(err); }
}

async function customerDecision(req, res, next) {
  try { res.json({ success: true, data: await appointmentService.customerDecision({ id: req.params.id, userId: req.user.id, accept: req.body.accept }) }); }
  catch (err) { next(err); }
}

async function cancel(req, res, next) {
  try { res.json({ success: true, data: await appointmentService.cancel(req.params.id, req.user.id) }); }
  catch (err) { next(err); }
}

async function checkIn(req, res, next) {
  try { res.status(201).json({ success: true, data: await appointmentService.checkIn({ ...req.body, id: req.params.id, userId: req.user.id, userRole: req.user.role }) }); }
  catch (err) { next(err); }
}

module.exports = { create, mine, queue, decide, customerDecision, cancel, checkIn };
