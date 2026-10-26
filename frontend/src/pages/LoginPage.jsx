import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('dung.receptionist@workshop.vn');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userData = await login(email, password);
      // Điều hướng theo vai trò người dùng
      if (userData.role === 'customer') {
        navigate('/portal');
      } else if (userData.role === 'mechanic') {
        navigate('/task-board');
      } else if (userData.role === 'receptionist') {
        navigate('/reception');
      } else if (userData.role === 'warehouse_staff') {
        navigate('/inventory');
      } else {
        navigate('/');
      }
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
            <span>AUTOMOTIVE REPAIR MANAGEMENT</span>
          </div>
        </div>

        <div className="login-story">
          <p className="eyebrow">Một quy trình, rõ từng bước</p>
          <h1>Vận hành xưởng sửa chữa liền mạch hơn.</h1>
          <p>
            Từ lúc xe vào xưởng đến khi hoàn tất sửa chữa, thông tin được tập trung
            theo từng khách hàng, phương tiện và phiếu công việc.
          </p>

          <ol className="workflow-list">
            <li>
              <span className="workflow-number">01</span>
              <span className="workflow-copy">
                <strong>Tiếp nhận xe</strong>
                <small>Lưu thông tin xe và yêu cầu sửa chữa</small>
              </span>
            </li>
            <li>
              <span className="workflow-number">02</span>
              <span className="workflow-copy">
                <strong>Chẩn đoán & báo giá</strong>
                <small>Phân công thợ và thống nhất hạng mục</small>
              </span>
            </li>
            <li>
              <span className="workflow-number">03</span>
              <span className="workflow-copy">
                <strong>Sửa chữa & bàn giao</strong>
                <small>Theo dõi phụ tùng, tiến độ và thanh toán</small>
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
          <h2>Chào mừng trở lại</h2>
          <p className="login-intro">Đăng nhập để tiếp tục công việc tại xưởng.</p>

          {error && <div className="alert alert-error" role="alert">{error}</div>}

          <form className="login-form" onSubmit={handleLogin}>
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
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary btn-login" disabled={loading}>
              {loading ? 'Đang xác thực...' : 'Đăng nhập'}
            </button>
          </form>

          <div className="demo-access">
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
          </div>
        </div>
      </section>
    </main>
  );
}
