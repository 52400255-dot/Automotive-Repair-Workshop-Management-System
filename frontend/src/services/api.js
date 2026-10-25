/**
 * api.js — Axios client dùng chung cho toàn bộ frontend.
 * Tự động gắn JWT token vào mọi request.
 */
import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
});

// Gắn token từ localStorage vào header Authorization
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Chỉ 401 biểu thị phiên/token không hợp lệ; 403 là thiếu quyền và giữ nguyên phiên.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
