/**
 * auth.controller — Đăng nhập / đăng ký / thông tin cá nhân
 */
const authService = require('../services/auth.service');

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    console.log(`[AUTH] Yêu cầu đăng nhập từ email: "${email}"`);
    const user = await authService.findByEmail(email);
    if (!user) {
      console.warn(`[AUTH] Đăng nhập thất bại: Không tìm thấy email "${email}" trong database`);
      return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng' });
    }
    const isValid = await authService.verifyPassword(password, user.password_hash);
    if (!isValid) {
      console.warn(`[AUTH] Đăng nhập thất bại: Mật khẩu không đúng cho email "${email}"`);
      return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng' });
    }
    console.log(`[AUTH] Đăng nhập thành công! User: ${user.full_name} (${user.role})`);
    const token = authService.generateToken(user);
    res.json({
      success: true,
      data: {
        token,
        user: { id: user.id, fullName: user.full_name, email: user.email, role: user.role },
      },
    });
  } catch (err) { next(err); }
}

async function register(req, res, next) {
  try {
    const { fullName, email, password, role } = req.body;
    const existing = await authService.findByEmail(email);
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email đã tồn tại' });
    }
    const user = await authService.createUser({ fullName, email, password, role: role || 'customer' });
    res.status(201).json({ success: true, data: user });
  } catch (err) { next(err); }
}

async function me(req, res, next) {
  try {
    const profile = await authService.getProfile(req.user.id);
    if (!profile) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    res.json({ success: true, data: profile });
  } catch (err) { next(err); }
}

module.exports = { login, register, me };
