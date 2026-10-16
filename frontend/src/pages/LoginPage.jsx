import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_USERS } from '../mocks/mockUsers';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');

    // Tìm tài khoản khớp với thông tin nhập từ Mock Users
    const foundUser = MOCK_USERS.find(
      (u) => u.email === email && u.password === password
    );

    if (foundUser) {
      // Lưu thông tin đăng nhập vào localStorage
      localStorage.setItem('user', JSON.stringify(foundUser));
      localStorage.setItem('token', 'mock-jwt-token-admin');

      alert(`Đăng nhập thành công với vai trò: ${foundUser.role}`);
      navigate('/reception'); // Hoặc điều hướng tới trang tương ứng
    } else {
      setError('Email hoặc Mật khẩu không chính xác! (Thử: admin@garage.com / 123)');
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: '100px auto', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>Garage Management</h2>
      <p>Dang nhap vao he thong</p>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: '15px' }}>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            required
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Mat khau</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            required
          />
        </div>

        <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#1890ff', color: '#fff', border: 'none', borderRadius: '4px' }}>
          Dang nhap
        </button>
      </form>
    </div>
  );
}