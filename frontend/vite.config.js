import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

/**
 * Buổi 9 — bỏ hard-code URL backend.
 *
 * TRƯỚC: `target: 'http://localhost:3000'` viết cứng trong file cấu hình,
 * muốn trỏ sang máy khác / port khác phải sửa mã nguồn.
 * SAU: đọc từ biến môi trường VITE_BACKEND_ORIGIN (file frontend/.env,
 * hoặc biến môi trường của tiến trình). Vẫn giữ 'http://localhost:3000' làm
 * giá trị mặc định vì đây là địa chỉ phát triển cục bộ, KHÔNG phải bí mật.
 *
 * Chỉ những giá trị công khai được đưa sang frontend qua tiền tố VITE_.
 * Mật khẩu DB và JWT_SECRET tuyệt đối không được đặt ở đây vì mã frontend
 * được gửi xuống trình duyệt và ai cũng xem được.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const backendOrigin = env.VITE_BACKEND_ORIGIN || 'http://localhost:3000'

  return {
    plugins: [react()],
    server: {
      port: Number(env.VITE_DEV_SERVER_PORT) || 5173,
      proxy: {
        '/api': {
          target: backendOrigin,
          changeOrigin: true,
        },
      },
    },
  }
})
