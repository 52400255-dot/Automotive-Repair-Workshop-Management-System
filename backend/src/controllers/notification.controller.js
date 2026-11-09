const notificationService = require('../services/notification.service');
const { isPositiveId } = require('../utils/workflow');

async function list(req, res, next) {
  try {
    const limit = req.query.limit || 30;
    res.json({ success: true, data: await notificationService.listForUser(req.user.id, { unreadOnly: req.query.unread === 'true', limit }) });
  } catch (err) { next(err); }
}

async function read(req, res, next) {
  try {
    if (!isPositiveId(req.params.id)) return res.status(400).json({ success: false, message: 'Mã thông báo không hợp lệ' });
    const item = await notificationService.markRead(req.params.id, req.user.id);
    if (!item) return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo' });
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
}

async function readAll(req, res, next) {
  try { res.json({ success: true, data: { updated: await notificationService.markAllRead(req.user.id) } }); }
  catch (err) { next(err); }
}

module.exports = { list, read, readAll };
