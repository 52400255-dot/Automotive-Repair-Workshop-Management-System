/**
 * user.controller — Quản lý người dùng và vai trò (US17)
 * Chỉ gọi user.service, không viết SQL ở đây.
 */
const userService = require('../services/user.service');

async function list(req, res, next) {
  try { res.json({ success: true, data: await userService.listUsers() }); }
  catch (err) { next(err); }
}

async function updateRole(req, res, next) {
  try {
    const updated = await userService.updateRole(req.params.id, req.body.role, req.user.id);
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
}

module.exports = { list, updateRole };
