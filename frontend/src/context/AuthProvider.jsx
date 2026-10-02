/**
 * AuthProvider — Component cung cấp phiên đăng nhập cho toàn ứng dụng.
 * (Context + hook nằm ở AuthContext.jsx)
 */
import { useState } from 'react';
import api from '../services/api';
import { AuthContext } from './AuthContext';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  /** Đăng nhập: gọi API, lưu token + user vào localStorage */
  async function login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    const { token, user: userData } = res.data.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  }

  /** Đăng xuất: xóa phiên */
  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}
