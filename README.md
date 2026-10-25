# Automotive Repair Workshop Management System

Đồ án môn **Công nghệ phần mềm (504011)** — ĐH Tôn Đức Thắng, Topic 12.  
Hệ thống web quản lý toàn bộ quy trình sửa chữa ô tô:  
**tiếp nhận xe → phân công thợ → chẩn đoán → báo giá → sửa chữa (trừ kho phụ tùng) → hóa đơn → thanh toán**.

---

## Thành viên

| Thành viên | MSSV | Vai trò |
|---|---|---|
| Dương Đình Đức | 52400109 | Trưởng nhóm — Frontend Lead (M1) |
| Lưu Nhật Quang | 52400229 | Backend API & Services Lead (M2) |
| Phùng Nguyễn Hoàng Khôi | 52400206 | Database & Security Lead (M3) |
| Tăng Duy Việt | 52400255 | QA & Testing Lead (M4) |

---

## Công nghệ

| Tầng | Công nghệ |
|---|---|
| **Frontend** | React 19 + Vite + React Router 7 + Axios |
| **Backend** | Node.js 22 + Express 5 (routes → controllers → services) |
| **Database** | PostgreSQL 16 — 15 migrations, parameterized query, transaction, FK/CHECK |
| **Auth** | JWT (HS256) + RBAC 6 vai trò, bcrypt password hash |
| **API Contract** | OpenAPI 3.1 — `api/openapi.yaml` |
| **Testing** | Node.js built-in test runner — 46 unit tests + 10 integration tests |
| **Container** | Docker Compose 3 dịch vụ: `db` + `backend` + `frontend` |
| **CI/CD** | GitHub Actions — lint, build, unit test, migration smoke test |

---

## Trạng thái Sprint (Sprint 3 / Tuần 3)

| Sprint | Tuần | Nội dung | Trạng thái |
|---|---|---|---|
| 1 | 1 | Nền tảng: requirements, kiến trúc, Auth (US16, US17) | ✅ Hoàn thành |
| 2 | 2 | Khách hàng & xe (US01, US02, US03) | ✅ Hoàn thành |
| **3** | **3** | **Tiếp nhận, phân công, chẩn đoán (US04, US06, US07, US08)** | ✅ **Hoàn thành** |
| 4 | 4 | Kho phụ tùng & tiến độ (US09, US10, US11, US12) | 🔲 Chưa bắt đầu |
| 5 | 5 | Báo giá & hóa đơn (US13, US14, US15) | 🔲 Chưa bắt đầu |
| 6 | 6 | Buffer & cải tiến | 🔲 Chưa bắt đầu |
| 7 | 7 | Kiểm thử tổng lực (US18, US19) | 🔲 Chưa bắt đầu |
| 8 | 8 | Triển khai & hoàn thiện (US20) | 🔲 Chưa bắt đầu |

---

## User Stories đã hoàn thành

| US | Tên | Trạng thái | API endpoint / Trang UI |
|---|---|---|---|
| US01 | Quản lý khách hàng | ✅ | `GET/POST/PUT /api/v1/customers` — `/customers` |
| US02 | Quản lý phương tiện | ✅ | `GET/POST/PUT /api/v1/vehicles` — `/customers` |
| US03 | Xem lịch sử sửa chữa theo xe | ✅ | `GET /api/v1/vehicles/:id/repair-history` — `/vehicle-history` |
| US04 | Tiếp nhận xe tạo phiếu sửa | ✅ | `POST /api/v1/repair-jobs` — `/reception` |
| US06 | Thợ ghi nhận chẩn đoán kỹ thuật | ✅ | `PUT /api/v1/repair-jobs/:id/diagnosis` — `/task-board` |
| US07 | Phân công thợ máy | ✅ | `PUT /api/v1/repair-jobs/:id/assign` — `/repair-jobs` |
| US08 | Thợ xem công việc được phân công | ✅ | `GET /api/v1/repair-jobs/my-jobs` — `/task-board` |
| US16 | Đăng nhập (JWT) | ✅ | `POST /api/v1/auth/login` — `/login` |
| US18 | Unit testing tự động | ✅ | 46 test cases — `tests/unit/` |

---

## Cấu trúc thư mục

```
.
├── api/
│   └── openapi.yaml            # Hợp đồng API OpenAPI 3.1
├── backend/
│   └── src/
│       ├── config/
│       │   └── db.js               # PostgreSQL connection pool
│       ├── controllers/            # Nhận request → gọi service → trả response
│       │   ├── auth.controller.js
│       │   ├── customer.controller.js
│       │   ├── estimate.controller.js
│       │   ├── invoice.controller.js
│       │   ├── repairJob.controller.js
│       │   ├── service.controller.js
│       │   ├── sparePart.controller.js
│       │   └── vehicle.controller.js
│       ├── middleware/
│       │   ├── auth.js             # Xác thực JWT
│       │   ├── rbac.js             # Phân quyền theo role
│       │   ├── validate.js         # Kiểm tra tham số đầu vào
│       │   └── errorHandler.js     # Global error handler
│       ├── routes/                 # Endpoint + RBAC guard
│       │   ├── auth.routes.js
│       │   ├── customer.routes.js
│       │   ├── estimate.routes.js
│       │   ├── health.routes.js
│       │   ├── invoice.routes.js
│       │   ├── repairJob.routes.js
│       │   ├── service.routes.js
│       │   ├── sparePart.routes.js
│       │   └── vehicle.routes.js
│       ├── services/               # Business logic + SQL thuần
│       │   ├── auth.service.js
│       │   ├── customer.service.js
│       │   ├── estimate.service.js
│       │   ├── invoice.service.js
│       │   ├── repairJob.service.js
│       │   ├── service.service.js
│       │   ├── sparePart.service.js
│       │   └── vehicle.service.js
│       ├── utils/
│       │   ├── pricing.js          # Tính giá thuần (estimate + VAT + kho)
│       │   └── workflow.js         # State machine & validation (US04, US06, US07, US08)
│       └── server.js
├── database/
│   ├── migrations/                 # 001 → 015, chạy tuần tự khi khởi tạo DB
│   │   ├── 001_init.sql            # Schema người dùng
│   │   ├── 002_customers_vehicles.sql
│   │   ├── 003_repair_jobs.sql
│   │   ├── 004_diagnoses.sql
│   │   ├── 005_mechanic_assignments.sql
│   │   ├── 006_repair_tasks.sql
│   │   ├── 007_spare_parts.sql
│   │   ├── 008_used_parts.sql
│   │   ├── 009_inventory_movements.sql
│   │   ├── 010_estimates.sql
│   │   ├── 011_invoices.sql
│   │   ├── 012_payments.sql
│   │   ├── 013_repair_workflow.sql
│   │   ├── 014_create_repair_job_function.sql
│   │   └── 015_seed_initial_services.sql  # 5 dịch vụ mặc định
│   ├── seeds/
│   │   ├── 001_customers_vehicles.sql
│   │   └── 002_full_demo_data.sql  # Demo đầy đủ với 3 xe, 3 phiếu, phụ tùng, hóa đơn
│   └── queries/
│       └── 001_check_customers_vehicles.sql
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── common/
│       │   │   └── StatusBadge.jsx # Badge trạng thái (tiếng Việt có dấu)
│       │   └── layout/
│       │       ├── Header.jsx
│       │       ├── Layout.jsx
│       │       └── Sidebar.jsx
│       ├── context/
│       │   ├── AuthContext.jsx
│       │   └── AuthProvider.jsx
│       ├── pages/
│       │   ├── DashboardPage.jsx
│       │   ├── LoginPage.jsx
│       │   ├── admin/
│       │   │   └── RoleManagementPage.jsx
│       │   ├── customer/
│       │   │   └── StatusPortalPage.jsx   # Khách hàng tra cứu trạng thái
│       │   ├── inventory/
│       │   │   ├── InventoryPage.jsx      # Quản lý kho phụ tùng
│       │   │   └── StockWarningPage.jsx
│       │   ├── mechanic/
│       │   │   ├── TaskBoardPage.jsx      # Bảng công việc thợ máy (US08)
│       │   │   └── ProgressPage.jsx
│       │   └── reception/
│       │       ├── ReceptionPage.jsx      # Tiếp nhận xe mới (US04)
│       │       ├── RepairJobsPage.jsx     # Danh sách phiếu + phân công (US07)
│       │       ├── VehicleHistoryPage.jsx # Lịch sử sửa chữa xe (US03)
│       │       ├── CustomersPage.jsx      # Quản lý KH & xe (US01, US02)
│       │       └── EstimatePage.jsx
│       ├── routes/
│       │   ├── AppRouter.jsx
│       │   └── ProtectedRoute.jsx
│       └── services/
│           └── api.js                     # Axios instance + interceptors JWT
├── tests/
│   ├── unit/
│   │   ├── pricing.test.js        # 24 cases: estimate, VAT, kho (canDeduct, applyStockMovement, isLowStock)
│   │   └── workflow.test.js       # 22 cases: state machine, validation (US04, US06, regression checks)
│   └── integration/
│       ├── repair-workflow.test.js # 4 cases: US04, US06, US07, US08 end-to-end API
│       └── vehicle-history.test.js # 6 cases: US03 API end-to-end
├── docs/
│   ├── 01-overview.md
│   ├── requirements.md            # 20 User Stories, Gherkin AC, ma trận RBAC
│   ├── backlog.md                 # Story points, gán sprint
│   ├── sprint-plan.md             # Lộ trình 8 tuần
│   ├── definition-of-done.md
│   ├── erd.md                     # ERD 14 bảng
│   ├── PROJECT_MEMORY.md          # Nhật ký quyết định kỹ thuật (cập nhật liên tục)
│   └── diagrams/                  # Use Case, Class, Sequence, Activity, State Machine
├── chay_backend.bat               # Script khởi động backend nhanh (Windows)
├── chay_frontend.bat              # Script khởi động frontend nhanh (Windows)
├── khoi_tao_database.bat          # Script tạo database + seed data (Windows)
├── docker-compose.yml
├── .env.example
└── package.json                   # Root: chạy unit test từ gốc project
```

---

## Cấu hình môi trường (`.env`) — áp dụng từ Buổi 9

Toàn bộ mật khẩu database, khóa JWT và địa chỉ backend **không còn viết cứng trong mã nguồn**. Mỗi máy tự khai báo cấu hình của mình qua file `.env`.

Các bước thiết lập lần đầu:

```bash
# 1. Tao file .env o thu muc goc (docker-compose dung file nay)
copy .env.example .env

# 2. Tao file .env rieng cho backend khi chay local khong qua Docker
copy backend\.env.example backend\.env

# 3. (Tuy chon) cho frontend dev server
copy frontend\.env.example frontend\.env
```

Sau đó mở file `.env` và điền giá trị máy bạn. Những biến đang được dùng:

| Biến | Dùng ở đâu | Bắt buộc? | Ghi chú |
|---|---|---|---|
| `PORT` | `backend/src/server.js` | Không | Mặc định `3000` |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` | `backend/src/config/db.js`, `setupDb.js` | `DB_NAME`/`DB_USER` có | Host/port mặc định `localhost:5432` |
| `DB_PASSWORD` | như trên | **Có** | Không còn giá trị mặc định trong code |
| `DB_SUPERUSER`, `DB_SUPERUSER_PASSWORD`, `DB_SUPERDATABASE` | `backend/src/scripts/setupDb.js` | Không | Chỉ dùng khi script phải tự tạo role/database; thiếu mật khẩu thì script sẽ hỏi trực tiếp, không đoán |
| `JWT_SECRET` | `middleware/auth.js`, `services/auth.service.js` | **Có** | Chuỗi ngẫu nhiên ≥ 32 ký tự |
| `JWT_EXPIRES_IN` | `services/auth.service.js` | Không | Mặc định `8h` |
| `VAT_RATE` | `services/invoice.service.js` | Không | Mặc định `0.10`; giá trị `0` được tôn trọng |
| `VITE_BACKEND_ORIGIN` | `frontend/vite.config.js` | Không | Mặc định `http://localhost:3000` |

Quy tắc an toàn:

- `.env`, `.env.local`, `.env.production`… **đã nằm trong `.gitignore`** — sẽ không bị commit.
- Chỉ `.env.example` được commit, và nó chỉ chứa tên biến + giá trị mẫu, không chứa bí mật.
- Backend đọc cấu hình theo thứ tự: biến môi trường của hệ thống → `backend/.env` → `.env` ở gốc. Thiếu biến bắt buộc thì ứng dụng **dừng ngay và báo lỗi rõ tên biến**, không âm thầm chạy bằng mật khẩu dự phòng.
- Nếu mật khẩu đã từng được push lên GitHub thì phải **đổi mật khẩu đó**, vì xóa file ở commit sau không làm nó biến mất khỏi lịch sử.

---

## Tài khoản demo

> Các tài khoản dưới đây là **dữ liệu mẫu trong database seed**, phục vụ chấm bài tại lớp. Chúng KHÔNG phải tài khoản hệ thống thật và không được dùng ở môi trường thật.

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Lễ tân | `dung.receptionist@workshop.vn` | `123456` |
| Lễ tân 2 | `duc.receptionist@workshop.vn` | `123456` |
| Thợ máy | `hieu.mechanic@workshop.vn` | `123456` |
| Thợ máy 2 | `khoa.mechanic@workshop.vn` | `123456` |
| Quản lý dịch vụ | `minh.manager@workshop.vn` | `123456` |
| Nhân viên kho | `ngoc.warehouse@workshop.vn` | `123456` |
| Quản trị viên | `admin@workshop.vn` | `123456` |

---

## Phân quyền (RBAC)

| Role | Trang / Chức năng |
|---|---|
| `receptionist` | Tiếp nhận xe, CRUD khách hàng & phương tiện, xem lịch sử, danh sách phiếu, phân công |
| `service_manager` | Xem & phân công phiếu sửa chữa, xem lịch sử |
| `mechanic` | Task board cá nhân, ghi chẩn đoán, cập nhật trạng thái |
| `warehouse_staff` | Quản lý kho phụ tùng |
| `customer` | Tra cứu trạng thái sửa chữa (portal) |
| `admin` | Toàn quyền |

---

## API chính

| Method | Endpoint | Role | Mô tả |
|---|---|---|---|
| POST | `/api/v1/auth/login` | — | Đăng nhập, nhận JWT |
| GET | `/api/v1/customers` | receptionist, admin | Danh sách khách hàng |
| GET | `/api/v1/vehicles` | receptionist, admin | Tìm kiếm xe |
| GET | `/api/v1/vehicles/:id/repair-history` | receptionist, manager | Lịch sử sửa chữa xe (US03) |
| POST | `/api/v1/repair-jobs` | receptionist | Tạo phiếu tiếp nhận (US04) |
| GET | `/api/v1/repair-jobs` | receptionist, manager | Danh sách phiếu sửa |
| GET | `/api/v1/repair-jobs/my-jobs` | mechanic | Công việc của thợ (US08) |
| PUT | `/api/v1/repair-jobs/:id/assign` | manager, receptionist | Phân công thợ (US07) |
| PUT | `/api/v1/repair-jobs/:id/status` | receptionist, manager, mechanic | Cập nhật trạng thái |
| PUT | `/api/v1/repair-jobs/:id/diagnosis` | mechanic | Ghi chẩn đoán (US06) |
| GET | `/api/v1/spare-parts` | warehouse, receptionist | Danh sách phụ tùng kho |
| GET | `/api/v1/services` | all | Danh mục dịch vụ sửa chữa |
| GET | `/api/health` | — | Health check |

Tài liệu API đầy đủ: [`api/openapi.yaml`](api/openapi.yaml)

---

## State Machine — Trạng thái phiếu sửa chữa

```
pending → diagnosing → estimated → approved → in_repair → completed
    ↘         ↘            ↘          ↘           ↘
  cancelled  cancelled   cancelled  cancelled   cancelled
```

| Trạng thái | Mô tả | Actor |
|---|---|---|
| `pending` | Vừa tiếp nhận, chờ phân công | Lễ tân |
| `diagnosing` | Thợ đang chẩn đoán | Thợ máy |
| `estimated` | Đã lập báo giá, chờ khách duyệt | Lễ tân / QM |
| `approved` | Khách duyệt, sẵn sàng sửa | Khách hàng |
| `in_repair` | Đang sửa chữa | Thợ máy |
| `completed` | Hoàn thành | Thợ máy |
| `cancelled` | Hủy | Bất kỳ |

---

## Quy trình Git

```
Issue → feature/USxx-<ten-ngan> branch → Code + Test → Commit → Push → Pull Request → Peer review → Merge main → CI xanh
```

Quy ước commit:
```
feat(sprint-N): mô tả ngắn
fix(module): mô tả lỗi
test: thêm/sửa test
docs: cập nhật tài liệu
```
