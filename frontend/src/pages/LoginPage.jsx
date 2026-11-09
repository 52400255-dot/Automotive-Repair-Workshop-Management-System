import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function LoginPage() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('dung.receptionist@workshop.vn');
  const [password, setPassword] = useState('123456');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegistering) {
        await api.post('/auth/register', { fullName, email, password, phone });
      }
      await login(email.trim(), password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Email hoặc mật khẩu không chính xác (mặc định demo: 123456)');
    } finally {
      setLoading(false);
    }
  };

  const setQuickAccount = (quickEmail) => {
    setEmail(quickEmail);
    setPassword('123456');
  };

  return (
    <main className="login-screen">
      <section className="login-showcase" aria-label="Giới thiệu hệ thống">
        <div className="login-brand">
          <div className="brand-mark" aria-hidden="true">G</div>
          <div>
          <strong>Garage Workshop</strong>
          <span>QUẢN LÝ XƯỞNG SỬA CHỮA Ô TÔ</span>
          </div>
        </div>

        <div className="login-story">
          <h1>Xe của bạn – Tận tâm từng công đoạn.</h1>
          <p>Theo dõi minh bạch, an tâm bàn giao.</p>

          <ol className="workflow-list">
            <li>
              <span className="workflow-number">01</span>
              <span className="workflow-copy">
                <strong>Tiếp nhận xe</strong>
                <small>Ghi nhận thông tin xe và mong muốn sửa chữa của bạn.</small>
                <em>Bạn nhận · Phiếu tiếp nhận</em>
              </span>
            </li>
            <li>
              <span className="workflow-number">02</span>
              <span className="workflow-copy">
                <strong>Chẩn đoán &amp; báo giá</strong>
                <small>Thợ kiểm tra xe, cùng bạn thống nhất hạng mục và chi phí.</small>
                <em>Bạn nhận · Báo giá chi tiết</em>
              </span>
            </li>
            <li>
              <span className="workflow-number">03</span>
              <span className="workflow-copy">
                <strong>Sửa chữa</strong>
                <small>Theo dõi phụ tùng và tiến độ từng phiếu sửa chữa.</small>
                <em>Bạn biết · Xe đang ở bước nào</em>
              </span>
            </li>
            <li>
              <span className="workflow-number">04</span>
              <span className="workflow-copy">
                <strong>Bàn giao</strong>
                <small>Hoàn tất phiếu, thanh toán và nhận lại xe.</small>
                <em>Bạn nhận · Xe và chứng từ thanh toán</em>
              </span>
            </li>
          </ol>
        </div>

        <p className="login-footnote">Công cụ nội bộ dành cho quy trình gara ô tô.</p>
      </section>

      <section className="login-panel-wrap" aria-label="Đăng nhập">
        <div className="login-panel">
          <div className="login-mobile-brand">
            <div className="brand-mark" aria-hidden="true">G</div>
            <strong>Garage Workshop</strong>
          </div>

          <p className="eyebrow">Khu vực thành viên</p>
          <h2>{isRegistering ? 'Tạo tài khoản khách hàng' : 'Chào mừng trở lại'}</h2>
          <p className="login-intro">
            {isRegistering
              ? 'Dùng đúng email và số điện thoại đã đăng ký tại xưởng để xem xe, phiếu sửa và duyệt báo giá.'
              : 'Đăng nhập để tiếp tục công việc tại xưởng.'}
          </p>

          {error && <div className="alert alert-error" role="alert">{error}</div>}

          <form className="login-form" onSubmit={handleLogin}>
            {isRegistering && (
              <>
                <div className="form-group">
                  <label htmlFor="register-full-name">Họ và tên</label>
                  <input
                    id="register-full-name"
                    type="text"
                    className="form-control"
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    minLength={2}
                    maxLength={150}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="register-phone">Số điện thoại</label>
                  <input
                    id="register-phone"
                    type="tel"
                    className="form-control"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
              </>
            )}
            <div className="form-group">
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                className="form-control"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="login-password">Mật khẩu</label>
              <input
                id="login-password"
                type="password"
                className="form-control"
                autoComplete={isRegistering ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={isRegistering ? 8 : undefined}
                maxLength={72}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary btn-login" disabled={loading}>
              {loading ? 'Đang xử lý...' : (isRegistering ? 'Tạo tài khoản và vào cổng khách' : 'Đăng nhập')}
            </button>
          </form>

          <p className="login-mode-toggle">
            {isRegistering ? 'Đã có tài khoản?' : 'Bạn là khách hàng?'}{' '}
            <button
              type="button"
              onClick={() => {
                const nextMode = !isRegistering;
                setIsRegistering(nextMode);
                if (nextMode) {
                  setFullName('');
                  setPhone('');
                  setEmail('');
                  setPassword('');
                }
                setError('');
              }}
            >
              {isRegistering ? 'Đăng nhập' : 'Tạo tài khoản khách'}
            </button>
          </p>

          {!isRegistering && <div className="demo-access">
            <div className="demo-access-heading">
              <span>Tài khoản demo nhanh</span>
              <span className="demo-tag">Dùng thử</span>
            </div>
            <div className="demo-accounts">
              <button type="button" className="demo-account" onClick={() => setQuickAccount('dung.receptionist@workshop.vn')}>
                Lễ tân · Dung
              </button>
              <button type="button" className="demo-account" onClick={() => setQuickAccount('hieu.mechanic@workshop.vn')}>
                Thợ máy · Hiếu
              </button>
              <button type="button" className="demo-account" onClick={() => setQuickAccount('minh.manager@workshop.vn')}>
                Quản lý · Minh
              </button>
              <button type="button" className="demo-account" onClick={() => setQuickAccount('admin@workshop.vn')}>
                Quản trị viên
              </button>
            </div>
            <p className="demo-password">Mật khẩu demo: <strong>123456</strong></p>
          </div>}
        </div>
      </section>
    </main>
  );
}
