/**
 * LoginPage — Màn hình đăng nhập cho tất cả vai trò.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(user.role === 'customer' ? '/portal' : '/');
    } catch (err) {
      setError(err.response?.data?.message || 'Dang nhap that bai');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#f5f5f5',
    }}>
      <form onSubmit={handleSubmit} className="card" style={{ width: 380 }}>
        <h1 style={{ fontSize: 20, marginBottom: 4 }}>Garage Management</h1>
        <p style={{ color: '#757575', marginBottom: 20 }}>Dang nhap vao he thong</p>

        {error && (
          <div style={{ background: '#ffebee', color: '#d32f2f', padding: '8px 12px', borderRadius: 6, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div className="form-group">
          <label>Email</label>
          <input className="form-control" type="email" value={email}
            onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </div>
        <div className="form-group">
          <label>Mat khau</label>
          <input className="form-control" type="password" value={password}
            onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
          disabled={loading}>
          {loading ? 'Dang dang nhap...' : 'Dang nhap'}
        </button>
      </form>
    </div>
  );
}
