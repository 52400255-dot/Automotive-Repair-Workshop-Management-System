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
| **Database** | PostgreSQL 16 — 19 migrations, parameterized query, transaction, FK/CHECK |
| **Auth** | JWT (HS256) + RBAC 6 vai trò, bcrypt password hash |
| **API Contract** | OpenAPI 3.1 — `api/openapi.yaml` |
| **Testing** | Node.js built-in test runner — unit test, API integration test, Playwright browser E2E |
| **Container** | Docker Compose 3 dịch vụ: `db` + `backend` + `frontend`; database dùng named volume để giữ dữ liệu qua lần khởi động lại |
| **CI/CD** | GitHub Actions — lint, build, unit test, coverage gate, API integration, health check, Playwright E2E |

---

## Tiến độ dự án — cập nhật 03/11/2026

Code hiện tại trên `main` đã có các luồng khách hàng/xe, sửa chữa, kho, báo giá, phân quyền và kiểm thử. US01–US14 và US16–US19 đã có trong code; phần còn lại là bổ sung UI hóa đơn cho US15 và triển khai public cho US20. Các PR tính năng US17, US18 và US19 đã được merge; commit mới nhất trong checkout là `03c5f78` (merge PR #45, ngày 02/11/2026).

| Sprint | Phạm vi | Trạng thái hiện tại |
|---|---|---|
| 1 | Nền tảng, đăng nhập và phân quyền (US16, US17) | ✅ Hoàn thành, đã merge |
| 2 | Khách hàng, xe và lịch sử sửa chữa (US01–US03) | ✅ Hoàn thành |
| 3 | Tiếp nhận, tạo phiếu và chẩn đoán (US04–US06) | ✅ Hoàn thành |
| 4 | Phân công, bảng việc và tiến độ sửa chữa (US07–US09) | ✅ Hoàn thành |
| 5 | Kho phụ tùng, ghi nhận sử dụng và cảnh báo tồn (US10–US12) | ✅ Hoàn thành |
| 6 | Báo giá, tính chi phí và hóa đơn (US13–US15) | 🟡 API/nghiệp vụ có; giao diện hóa đơn còn thiếu |
| 7 | Unit, API integration, browser E2E và CI (US18–US19) | ✅ Hoàn thành, đã merge |
| 8 | Triển khai và hoàn thiện (US20) | 🔄 CI và Docker Compose đã có; chưa cấu hình triển khai public |

### Nhật ký công việc tuần 5 — M4 Việt (01/11/2026)

Tuần này tập trung vào coverage, kiểm thử API và E2E trình duyệt cho phân quyền. Đồng thời đã tích hợp một số sửa lỗi phát hiện khi chạy dự án bằng Docker và hoàn thiện luồng tài khoản khách hàng, báo giá, xóa phiếu sửa chữa.

| Hạng mục | Thay đổi / kết quả |
|---|---|
| **US18 — Coverage** | Thêm lệnh `npm run test:coverage` cho business logic đã chọn, đặt ngưỡng tối thiểu 60% cho line, statement, function và branch; bổ sung unit test xác thực và RBAC. |
| **US19 — API integration** | Bổ sung integration test cho luồng sửa chữa, lịch sử xe, báo giá/kho và quản lý role; chạy trên PostgreSQL test riêng. |
| **US19 — Browser E2E** | Thêm Playwright config và luồng E2E quản trị role: admin đổi role, tải lại xác nhận dữ liệu đã lưu, người dùng thường bị chặn khỏi màn quản lý role. |
| **CI** | GitHub Actions chạy frontend lint/build, unit test, coverage gate, API integration, health check và Playwright E2E; lưu Playwright report làm artifact. |
| **Đăng ký khách hàng / duyệt báo giá** | Đăng ký tài khoản khách nối hồ sơ có sẵn bằng email và số điện thoại; tạo user + liên kết hồ sơ trong transaction; thêm danh sách báo giá của đúng khách và thao tác đồng ý/từ chối trên portal. Duyệt/từ chối được giới hạn cho khách sở hữu báo giá. |
| **Xóa phiếu sửa chữa** | Thêm endpoint và thao tác xóa phiếu cho lễ tân/quản lý/admin. Xóa trong transaction kèm dữ liệu con; chặn phiếu đã được duyệt, đã bắt đầu sửa/hoàn tất, đã ghi nhận phụ tùng hoặc có hóa đơn để bảo toàn lịch sử. Xóa khách cần dọn phiếu đủ điều kiện rồi xóa xe trước. |
| **Docker / giao diện** | Đồng bộ role DB với database hiện có, chuyển dữ liệu sang named volume bền vững, thêm phản hồi `GET /`, cấp quyền xem kho cho quản lý dịch vụ nhưng vẫn giữ quyền nhập kho riêng, và sửa ô tìm kiếm phiếu bị tràn. Docker Compose khởi động lại thành công, health check PostgreSQL healthy. |

Các thay đổi US17 đã được merge qua PR #42–#45; US18/US19 đã được merge qua PR #44. Trạng thái issue trên GitHub có thể khác trạng thái code trong nhánh `main`.

---

## Tình trạng User Stories

| US | Tên | Trạng thái | API endpoint / Trang UI |
|---|---|---|---|
| US01 | Quản lý khách hàng | ✅ | CRUD `/api/v1/customers` — `/customers` |
| US02 | Quản lý phương tiện | ✅ | CRUD `/api/v1/vehicles` — `/vehicles` |
| US03 | Lịch sử sửa chữa theo xe | ✅ | `GET /api/v1/vehicles/:id/repair-history` — `/vehicle-history` |
| US04 | Tiếp nhận xe | ✅ | `POST /api/v1/repair-jobs` — `/reception` |
| US05 | Tạo và quản lý phiếu sửa chữa | ✅ | `/api/v1/repair-jobs` — `/repair-jobs` |
| US06 | Ghi nhận chẩn đoán | ✅ | `PUT /api/v1/repair-jobs/:id/diagnosis` — `/task-board` |
| US07 | Phân công thợ máy | ✅ | `PUT /api/v1/repair-jobs/:id/assign` — `/repair-jobs` |
| US08 | Xem việc được phân công | ✅ | `GET /api/v1/repair-jobs/my-jobs` — `/task-board` |
| US09 | Cập nhật tiến độ sửa chữa | ✅ | `PUT /api/v1/repair-jobs/:id/status` — `/task-board` |
| US10 | Quản lý phụ tùng | ✅ | CRUD `/api/v1/spare-parts` — `/inventory` |
| US11 | Ghi nhận phụ tùng sử dụng, trừ kho | ✅ | `POST /api/v1/spare-parts/:id/deduct` — `/task-board` |
| US12 | Theo dõi tồn kho thấp | ✅ | `GET /api/v1/spare-parts/low-stock` — `/inventory` |
| US13 | Lập và gửi báo giá | ✅ | `POST /api/v1/estimates` — `/repair-jobs`, khách xem tại `/portal` |
| US14 | Tính chi phí sửa chữa và VAT | ✅ | Tính trong service báo giá/hóa đơn; integration test nghiệp vụ |
| US15 | Tạo hóa đơn và ghi nhận thanh toán | 🟡 | `POST /api/v1/invoices`, `PUT /api/v1/invoices/:id/pay`; chưa có màn hình hóa đơn riêng |
| US16 | Đăng nhập bằng JWT | ✅ | `POST /api/v1/auth/login` — `/login` |
| US17 | Quản lý vai trò và quyền | ✅ | `/api/v1/users` — `/admin/roles` |
| US18 | Unit test và coverage gate | ✅ | `tests/unit/`; CI đặt ngưỡng coverage 60% cho business logic được chọn |
| US19 | API integration và browser E2E | ✅ | 18 integration test và 2 Playwright E2E trong `tests/integration/`, `frontend/e2e/`; chạy qua GitHub Actions |
| US20 | CI/CD và triển khai | 🟡 | GitHub Actions và Docker Compose đã có; chưa có cấu hình/URL triển khai public |

---

## Cấu trúc thư mục

```
.
├── .github/
│   └── workflows/ci.yml       # Lint/build, unit, coverage, integration, E2E
├── api/
│   └── openapi.yaml            # Hợp đồng API OpenAPI 3.1
├── backend/
│   └── src/
│       ├── config/
│       │   ├── db.js               # PostgreSQL connection pool
│       │   └── env.js              # Nạp và kiểm tra biến môi trường
│       ├── scripts/
│       │   └── setupDb.js           # Khởi tạo role/database và migrations
│       ├── controllers/            # Nhận request → gọi service → trả response
│       │   ├── auth.controller.js
│       │   ├── customer.controller.js
│       │   ├── estimate.controller.js
│       │   ├── invoice.controller.js
│       │   ├── repairJob.controller.js
│       │   ├── service.controller.js
│       │   ├── sparePart.controller.js
│       │   ├── user.controller.js
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
│       │   ├── user.routes.js
│       │   └── vehicle.routes.js
│       ├── services/               # Business logic + SQL thuần
│       │   ├── auth.service.js
│       │   ├── customer.service.js
│       │   ├── estimate.service.js
│       │   ├── invoice.service.js
│       │   ├── repairJob.service.js
│       │   ├── service.service.js
│       │   ├── sparePart.service.js
│       │   ├── user.service.js
│       │   └── vehicle.service.js
│       ├── utils/
│       │   ├── pricing.js          # Tính giá thuần (estimate + VAT + kho)
│       │   └── workflow.js         # State machine & validation (US04, US06, US07, US08)
│       └── server.js
├── database/
│   ├── migrations/                 # 001 → 019, chạy tuần tự khi khởi tạo DB
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
│   │   ├── 015_seed_initial_services.sql  # 5 dịch vụ mặc định
│   │   ├── 016_repair_workflow_procedures_triggers.sql
│   │   ├── 017_add_customer_address.sql
│   │   ├── 018_add_vehicle_odometer.sql
│   │   └── 019_fix_mechanic_reassignment.sql
│   ├── seeds/
│   │   ├── 001_customers_vehicles.sql
│   │   └── 002_full_demo_data.sql  # Demo đầy đủ với 3 xe, 3 phiếu, phụ tùng, hóa đơn
│   └── queries/
│       └── 001_check_customers_vehicles.sql
├── frontend/
│   ├── src/
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
│       │   │   └── ProgressPage.jsx       # Trang cũ, không được định tuyến
│       │   └── reception/
│       │       ├── ReceptionPage.jsx      # Tiếp nhận xe mới (US04)
│       │       ├── RepairJobsPage.jsx     # Danh sách phiếu + phân công (US07)
│       │       ├── EstimateModal.jsx      # Lập báo giá từ phiếu sửa chữa
│       │       ├── VehicleHistoryPage.jsx # Lịch sử sửa chữa xe (US03)
│       │       ├── CustomersPage.jsx      # Quản lý khách hàng (US01)
│       │       ├── VehiclesPage.jsx       # Quản lý phương tiện (US02)
│       │       └── EstimatePage.jsx       # Trang mẫu cũ, không được định tuyến
│       ├── routes/
│       │   ├── AppRouter.jsx
│       │   └── ProtectedRoute.jsx
│       └── services/
│           └── api.js                     # Axios instance + interceptors JWT
│   ├── e2e/
│   │   └── role-management.spec.js       # Browser E2E bằng Playwright
│   └── playwright.config.js
├── tests/
│   ├── helpers/
│   │   ├── roleManagementFixtures.js # Fixtures API/E2E phân quyền
│   │   └── testEnv.js                # Bảo vệ test khỏi chạy nhầm database demo
│   ├── unit/
│   │   ├── buoi9-auth-middleware.test.js
│   │   ├── buoi9-config-env.test.js
│   │   ├── buoi9-error-handler.test.js
│   │   ├── rbac.test.js              # Kiểm tra middleware xác thực và phân quyền
│   │   ├── user-service.test.js      # Kiểm tra quản lý role và người dùng
│   │   ├── pricing.test.js           # Giá dịch vụ, VAT và trừ kho
│   │   └── workflow.test.js          # State machine và validation
│   └── integration/
│       ├── estimate-parts-workflow.test.js
│       ├── repair-workflow.test.js
│       ├── user-role-management.test.js # API quản lý role, JWT, quyền truy cập đồng thời
│       └── vehicle-history.test.js
├── docs/
│   ├── 01-overview.md
│   ├── requirements.md            # 20 User Stories, Gherkin AC, ma trận RBAC
│   ├── backlog.md                 # Story points, gán sprint
│   ├── sprint-plan.md             # Lộ trình 8 tuần
│   ├── definition-of-done.md
│   ├── erd.md                     # ERD cơ sở dữ liệu
│   ├── PROJECT_MEMORY.md          # Nhật ký quyết định kỹ thuật (cập nhật liên tục)
│   └── diagrams/                  # Use Case, Class, Sequence, Activity, State Machine
├── chay_backend.bat               # Script khởi động backend nhanh (Windows)
├── chay_frontend.bat              # Script khởi động frontend nhanh (Windows)
├── khoi_tao_database.bat          # Script tạo database + seed data (Windows)
├── docker-compose.yml
├── .env.example
└── package.json                   # Root: lệnh unit/integration test và chạy dev
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

## Chạy kiểm thử

```bash
# Unit tests và API integration tests (chạy từ thư mục gốc)
npm test
npm run test:integration
npm run test:all

# Coverage business logic (chạy từ thư mục gốc)
npm run test:coverage --prefix backend

# Browser E2E — cần PostgreSQL test riêng đã áp dụng migrations và biến DB_* trong .env
npm ci --prefix frontend
npm run test:e2e --prefix frontend
```

`DB_NAME` dùng cho integration/E2E phải có chữ `test` trong tên để tránh chạy nhầm lên database demo. Job GitHub Actions tự tạo PostgreSQL riêng, áp dụng migration và lưu Playwright report làm artifact.

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
| `service_manager` | Xem & phân công phiếu sửa chữa, xem lịch sử, xem kho và xóa phiếu đủ điều kiện |
| `mechanic` | Task board cá nhân, ghi chẩn đoán, cập nhật trạng thái |
| `warehouse_staff` | Quản lý kho phụ tùng |
| `customer` | Tra cứu xe, xem và xác nhận/từ chối báo giá thuộc hồ sơ đã liên kết |
| `admin` | Toàn quyền |

---

## API chính

| Method | Endpoint | Role | Mô tả |
|---|---|---|---|
| POST | `/api/v1/auth/login` | — | Đăng nhập, nhận JWT |
| POST | `/api/v1/auth/register` | — | Đăng ký tài khoản khách; nối hồ sơ có sẵn khi email và số điện thoại cùng khớp |
| GET | `/api/v1/users` | admin | Danh sách người dùng, chỉ trả các trường công khai |
| PATCH | `/api/v1/users/:id/role` | admin | Đổi role; chặn tự hạ quyền và hạ quyền admin cuối cùng |
| GET/POST/PUT/DELETE | `/api/v1/customers` | receptionist, admin (ghi); manager cũng được xem | Tra cứu và quản lý hồ sơ khách hàng |
| GET/POST/PUT/DELETE | `/api/v1/vehicles` | receptionist, admin (ghi); manager cũng được xem | Tra cứu và quản lý phương tiện |
| GET | `/api/v1/vehicles/:id/repair-history` | customer (xe thuộc hồ sơ), receptionist, manager, admin | Lịch sử sửa chữa xe (US03) |
| POST | `/api/v1/repair-jobs` | receptionist | Tiếp nhận xe, tạo phiếu sửa (US04–05) |
| GET | `/api/v1/repair-jobs` | receptionist, manager, admin | Danh sách phiếu sửa chữa |
| GET | `/api/v1/repair-jobs/my-jobs` | mechanic | Công việc được phân công (US08) |
| PUT | `/api/v1/repair-jobs/:id/assign` | service_manager, receptionist | Phân công thợ (US07) |
| PUT | `/api/v1/repair-jobs/:id/diagnosis` | mechanic | Ghi chẩn đoán (US06) |
| PUT | `/api/v1/repair-jobs/:id/status` | receptionist, manager, mechanic, admin | Cập nhật tiến độ theo state machine (US09) |
| DELETE | `/api/v1/repair-jobs/:id` | receptionist, manager, admin | Xóa phiếu đủ điều kiện; bảo vệ dữ liệu kho/tài chính |
| GET/POST/PUT | `/api/v1/spare-parts` | người dùng đã xác thực (xem); warehouse, admin (ghi) | Tra cứu và quản lý phụ tùng (US10) |
| GET | `/api/v1/spare-parts/low-stock` | warehouse, manager, admin | Danh sách tồn kho thấp (US12) |
| POST | `/api/v1/spare-parts/:id/import` | warehouse, admin | Nhập hàng vào kho |
| POST | `/api/v1/spare-parts/:id/deduct` | mechanic, warehouse, admin | Ghi nhận phụ tùng sử dụng và trừ kho (US11) |
| POST | `/api/v1/estimates` | receptionist | Lập báo giá và tính tổng chi phí (US13–14) |
| GET | `/api/v1/estimates/my` | customer | Báo giá thuộc hồ sơ khách đang đăng nhập |
| PUT | `/api/v1/estimates/:id/approve` | customer sở hữu báo giá | Đồng ý báo giá, chuyển phiếu sang `approved` |
| PUT | `/api/v1/estimates/:id/reject` | customer sở hữu báo giá | Từ chối báo giá và hủy phiếu |
| POST | `/api/v1/invoices` | receptionist | Tạo hóa đơn từ phiếu hoàn tất (US15) |
| GET | `/api/v1/invoices/:id` | customer sở hữu hóa đơn, receptionist, manager, admin | Xem chi tiết hóa đơn |
| PUT | `/api/v1/invoices/:id/pay` | receptionist, admin | Ghi nhận thanh toán hóa đơn |
| GET | `/api/v1/services` | người dùng đã xác thực | Danh mục dịch vụ sửa chữa |
| GET | `/` | — | Trạng thái API; health check chi tiết ở `/api/health` |
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
Issue → feature/USxx-<ten-ngan> branch → Code + Test → Commit → Push → Pull Request → Peer review → Merge vào nhánh phát triển chung → CI xanh
```

Quy trình nhóm trong `Quy trình git.docx` chọn `develop` làm nhánh đích. Remote repository hiện chỉ có nhánh mặc định `main`, chưa có `develop`; vì vậy PR của repo này cần nhắm vào `main` trừ khi nhóm tạo và thống nhất nhánh `develop` trước. Không push trực tiếp lên nhánh chung. Chỉ đóng issue sau khi acceptance criteria, CI, review và merge đã hoàn thành.

Quy ước commit:
```
feat(sprint-N): mô tả ngắn
fix(module): mô tả lỗi
test: thêm/sửa test
docs: cập nhật tài liệu
```
