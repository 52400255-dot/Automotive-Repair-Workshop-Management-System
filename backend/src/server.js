/**
 * server.js — Điểm khởi tạo Express Application
 *
 * Kiến trúc tầng (layered):
 *   routes/     → định nghĩa endpoint + phân quyền
 *   controllers/→ nhận request, gọi service, trả response
 *   services/   → logic nghiệp vụ + truy vấn database
 *   middleware/ → auth JWT, RBAC, validate, error handler
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const customerRoutes = require('./routes/customer.routes');
const vehicleRoutes = require('./routes/vehicle.routes');
const repairJobRoutes = require('./routes/repairJob.routes');
const sparePartRoutes = require('./routes/sparePart.routes');
const estimateRoutes = require('./routes/estimate.routes');
const invoiceRoutes = require('./routes/invoice.routes');
const { errorHandler } = require('./middleware/errorHandler');
const { testConnection } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ---- Routes ----
app.use('/api/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/vehicles', vehicleRoutes);
app.use('/api/v1/repair-jobs', repairJobRoutes);
app.use('/api/v1/spare-parts', sparePartRoutes);
app.use('/api/v1/estimates', estimateRoutes);
app.use('/api/v1/invoices', invoiceRoutes);

// ---- 404 cho route không tồn tại ----
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Không tìm thấy ${req.method} ${req.originalUrl}` });
});

// ---- Global error handler (luôn đặt cuối cùng) ----
app.use(errorHandler);

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  try {
    await testConnection();
  } catch (err) {
    console.error('PostgreSQL connection failed:', err.message);
  }
});

module.exports = app;
