/**
 * Middleware xử lý lỗi toàn cục (Global Error Handler)
 *
 * Đặt SAU TẤT CẢ các routes trong server.js.
 * Bắt mọi lỗi được throw hoặc gọi next(error) từ controller/service.
 *
 * Buổi 9 — sửa cảnh báo SonarLint S1541 "cyclomatic-complexity":
 *   Ham cu co 14 nhanh `if` nong doc, chi so phuc tap vong lap (cyclomatic
 *   complexity) = 21, vuong nguong 10 cua rule. Moi lan them mot loai loi la
 *   them mot doan `if` trung hinh dang (chi khac ma trang thai va chuoi thong
 *   bao). Da chuyen sang BANG TRA (lookup table) khai bao: them loai loi moi
 *   chi can them mot dong du lieu, khong can sua dong kiem tra.
 */
const { env } = require('../config/env');

/** Ma loi PostgreSQL du dung o duoi day. */
const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';
const PG_BAD_INPUT_CODES = new Set(['23502', '23514', '22P02', '22003', '22001']);
/** RAISE EXCEPTION tu stored procedure khi dich vu khong ton tai. */
const PG_SERVICE_NOT_FOUND = /^service_id .* does not exist$/;

/**
 * Bang tra loi dua theo `err.name`.
 * Thu tu mang co nghia (chi co mot phan tu khop nen khong anh huong,
 * giu nguyen nhu hanh vi cu cua chuoi `if`).
 */
const ERROR_NAME_RULES = [
  {
    name: 'ValidationError',
    status: 400,
    message: 'Dữ liệu không hợp lệ (Validation failed)',
    build: (err) => ({ message: err.message || 'Dữ liệu không hợp lệ (Validation failed)', errors: err.errors || [] }),
  },
  {
    name: 'UnauthorizedError',
    status: 401,
    build: (err) => ({ message: err.message || 'Không được phép truy cập (Unauthorized)' }),
  },
  {
    name: 'ForbiddenError',
    status: 403,
    build: (err) => ({ message: err.message || 'Không đủ quyền (Forbidden)' }),
  },
  {
    name: 'NotFoundError',
    status: 404,
    build: (err) => ({ message: err.message || 'Không tìm thấy (Not found)' }),
  },
];

/**
 * Bang tra loi dua theo ma loi PostgreSQL (`err.code`).
 * Moi phan tu co the co ham `match` rieng (vi du P0001 can kiem ca noi dung).
 */
const PG_ERROR_RULES = [
  {
    match: (err) => err.code === PG_UNIQUE_VIOLATION,
    status: () => 409,
    build: () => ({ message: 'Dữ liệu đã tồn tại (Duplicate entry)' }),
  },
  {
    match: (err) => err.code === PG_FOREIGN_KEY_VIOLATION,
    // Xoa du lieu bi tham chiếu -> xung dot (409); doc/cap nhat lien ket khong ton tai -> 404.
    status: (req) => (req.method === 'DELETE' ? 409 : 404),
    build: (_err, req) => ({
      message: req.method === 'DELETE'
        ? 'Dữ liệu đang được tham chiếu, không thể xóa'
        : 'Dữ liệu tham chiếu không tồn tại',
    }),
  },
  {
    match: (err) => PG_BAD_INPUT_CODES.has(err.code),
    status: () => 400,
    build: () => ({ message: 'Dữ liệu không hợp lệ hoặc vượt giới hạn' }),
  },
  {
    match: (err) => err.code === 'P0001' && PG_SERVICE_NOT_FOUND.test(err.message || ''),
    status: () => 404,
    build: () => ({ message: 'Không tìm thấy dịch vụ' }),
  },
];

/** Tim quy uoc theo `err.name`, tra ve {status, body} hoac null. */
function resolveByName(err) {
  const rule = ERROR_NAME_RULES.find((item) => item.name === err.name);
  return rule ? { status: rule.status, body: rule.build(err) } : null;
}

/** Tim quy uoc theo ma loi PostgreSQL, tra ve {status, body} hoac null. */
function resolveByPgCode(err, req) {
  const rule = PG_ERROR_RULES.find((item) => item.match(err));
  return rule ? { status: rule.status(req), body: rule.build(err, req) } : null;
}

/** Ghi log loi ra console (stack chi log khi o che do development). */
function logError(err) {
  console.error(`[ERROR] ${err.name || 'Error'}: ${err.message}`);
  if (env.isDevelopment) {
    console.error(err.stack);
  }
}

/**
 * errorHandler — Xử lý lỗi tập trung
 * @param {Error} err   - Đối tượng lỗi
 * @param {object} req  - Express request
 * @param {object} res  - Express response
 * @param {Function} next - Express next (bắt buộc phải có 4 tham số để Express nhận diện error middleware)
 */
function errorHandler(err, req, res, next) {
  logError(err);

  const handled = resolveByName(err) || resolveByPgCode(err, req);
  if (handled) {
    return res.status(handled.status).json({ success: false, ...handled.body });
  }

  // Không đưa thông tin lỗi nội bộ (SQL, đường dẫn, cấu hình) ra ngoài khi 5xx.
  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    message: statusCode >= 500
      ? 'Lỗi máy chủ nội bộ (Internal server error)'
      : (err.message || 'Yêu cầu không hợp lệ'),
  });
}

module.exports = { errorHandler };
