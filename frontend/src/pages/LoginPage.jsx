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
    <div style={{ padding: '24px', maxWidth: '440px', margin: '60px auto', background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <h2 style={{ margin: '0 0 8px 0', color: '#1976d2' }}>Garage Workshop MS</h2>
      <p style={{ color: '#666', marginTop: 0, marginBottom: '20px' }}>Đăng nhập hệ thống quản lý sửa chữa ô tô</p>

      {error && (
        <div style={{ padding: '10px 12px', background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: '4px', color: '#cf1322', marginBottom: '16px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '14px' }}>Email</label>
          <input
            type="email"
            className="form-control"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', boxSizing: 'border-box' }}
            required
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '14px' }}>Mật khẩu</label>
          <input
            type="password"
            className="form-control"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', boxSizing: 'border-box' }}
            required
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          style={{ width: '100%', padding: '10px', fontSize: '15px' }}
        >
          {loading ? 'Đang xác thực...' : 'Đăng nhập'}
        </button>
      </form>

      <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px dashed #d9d9d9' }}>
        <p style={{ fontSize: '12px', color: '#888', margin: '0 0 8px 0', fontWeight: 600 }}>Tài khoản demo nhanh (mật khẩu: 123456):</p>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => setQuickAccount('dung.receptionist@workshop.vn')} style={{ fontSize: '12px', padding: '4px 8px', cursor: 'pointer', background: '#f5f5f5', border: '1px solid #d9d9d9', borderRadius: '4px' }}>
            Lễ tân (Dung)
          </button>
          <button type="button" onClick={() => setQuickAccount('hieu.mechanic@workshop.vn')} style={{ fontSize: '12px', padding: '4px 8px', cursor: 'pointer', background: '#f5f5f5', border: '1px solid #d9d9d9', borderRadius: '4px' }}>
            Thợ máy (Hiếu)
          </button>
          <button type="button" onClick={() => setQuickAccount('minh.manager@workshop.vn')} style={{ fontSize: '12px', padding: '4px 8px', cursor: 'pointer', background: '#f5f5f5', border: '1px solid #d9d9d9', borderRadius: '4px' }}>
            Quản lý (Minh)
          </button>
          <button type="button" onClick={() => setQuickAccount('admin@workshop.vn')} style={{ fontSize: '12px', padding: '4px 8px', cursor: 'pointer', background: '#f5f5f5', border: '1px solid #d9d9d9', borderRadius: '4px' }}>
            Admin
          </button>
        </div>
      </div>
    </div>
  );
}