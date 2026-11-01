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
| **Testing** | Node.js built-in test runner — 105 unit tests, 18 API integration tests, Playwright browser E2E |
| **Container** | Docker Compose 3 dịch vụ: `db` + `backend` + `frontend`; database dùng named volume để giữ dữ liệu qua lần khởi động lại |
| **CI/CD** | GitHub Actions — lint, build, unit test, migration smoke test |

---

## Kế hoạch Sprint ban đầu

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

### Cập nhật công việc tuần 5 — M4 Việt (01/11/2026)

Tuần này tập trung vào coverage, kiểm thử API và E2E trình duyệt cho phân quyền. Đồng thời đã tích hợp một số sửa lỗi phát hiện khi chạy dự án bằng Docker và hoàn thiện luồng tài khoản khách hàng, báo giá, xóa phiếu sửa chữa.

| Hạng mục | Thay đổi / kết quả |
|---|---|
| **US18 — Coverage** | Thêm lệnh `npm run test:coverage` cho business logic đã chọn, đặt ngưỡng tối thiểu 60% cho line, statement, function và branch; thêm unit test RBAC cho phép role, từ chối role (403), và chưa xác thực (401). Local: **105/105 unit test đạt; line coverage 99,39%, branch 96,09%, function 100%**. |
| **US19 — API integration** | Thêm fixture tạo/dọn user thử nghiệm và integration test API quản lý role: admin xem/đổi role; role thường và anonymous bị chặn; kiểm tra role sai, ID không tồn tại, không lộ `password_hash`, quyền JWT cũ, admin cuối cùng và request đồng thời. Local: **18/18 integration test đạt** trên PostgreSQL riêng tên có hậu tố `_test`. |
| **US19 — Browser E2E** | Thêm Playwright config và hai luồng E2E cho admin đổi role, tải lại xác nhận dữ liệu đã lưu, và người dùng thường không truy cập được màn quản lý role. Chỉnh nút đăng nhập không dịch chuyển khi hover và chờ hiệu ứng kết thúc trước thao tác; local: **2/2 E2E đạt**. |
| **CI** | Thêm job coverage và job role-management E2E vào GitHub Actions; lưu Playwright report làm artifact. Frontend lint và production build đều đạt khi kiểm tra local. |
| **Đăng ký khách hàng / duyệt báo giá** | Đăng ký tài khoản khách nối hồ sơ có sẵn bằng email và số điện thoại; tạo user + liên kết hồ sơ trong transaction; thêm danh sách báo giá của đúng khách và thao tác đồng ý/từ chối trên portal. Duyệt/từ chối được giới hạn cho khách sở hữu báo giá. |
| **Xóa phiếu sửa chữa** | Thêm endpoint và thao tác xóa phiếu cho lễ tân/quản lý/admin. Xóa trong transaction kèm dữ liệu con; chặn phiếu đã được duyệt, đã bắt đầu sửa/hoàn tất, đã ghi nhận phụ tùng hoặc có hóa đơn để bảo toàn lịch sử. Xóa khách cần dọn phiếu đủ điều kiện rồi xóa xe trước. |
| **Docker / giao diện** | Đồng bộ role DB với database hiện có, chuyển dữ liệu sang named volume bền vững, thêm phản hồi `GET /`, cấp quyền xem kho cho quản lý dịch vụ nhưng vẫn giữ quyền nhập kho riêng, và sửa ô tìm kiếm phiếu bị tràn. Docker Compose khởi động lại thành công, health check PostgreSQL healthy. |

**Còn thiếu để đóng US18/US19:** xác nhận GitHub Actions xanh sau khi push; có ít nhất một reviewer approve và merge PR theo quy trình nhóm. DoD trên GitHub yêu cầu review và merge nên hai issue vẫn mở cho đến khi các bước đó hoàn tất.

---

## Tình trạng User Stories

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
| US18 | Unit testing tự động + coverage gate | 🔄 | 105 test cases — `tests/unit/`; coverage business logic tối thiểu 60% (local đạt, chờ CI/review/merge) |
| US19 | API integration & browser E2E | 🔄 | 18 integration tests và 2 Playwright E2E đạt local; CI/review/merge đang chờ |

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
│   ├── helpers/
│   │   ├── roleManagementFixtures.js # Fixtures API/E2E phân quyền
│   │   └── testEnv.js                # Bảo vệ test khỏi chạy nhầm database demo
│   ├── unit/
│   │   ├── rbac.test.js              # Kiểm tra middleware xác thực và phân quyền
│   │   ├── user-service.test.js      # Kiểm tra quản lý role và người dùng
│   │   ├── pricing.test.js           # Giá dịch vụ, VAT và trừ kho
│   │   └── workflow.test.js          # State machine và validation
│   └── integration/
│       ├── estimate-parts-workflow.test.js
│       ├── repair-workflow.test.js
│       ├── user-role-management.test.js # API quản lý role, JWT, quyền truy cập đồng thời
│       └── vehicle-history.test.js
├── frontend/
│   ├── e2e/role-management.spec.js   # Hai luồng browser E2E bằng Playwright
│   └── playwright.config.js
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

## Chạy kiểm thử

```bash
# Unit tests và API integration tests (chạy từ thư mục gốc)
npm test
npm run test:integration

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
| GET | `/api/v1/customers` | receptionist, admin | Danh sách khách hàng |
| GET | `/api/v1/vehicles` | receptionist, admin | Tìm kiếm xe |
| GET | `/api/v1/vehicles/:id/repair-history` | receptionist, manager | Lịch sử sửa chữa xe (US03) |
| POST | `/api/v1/repair-jobs` | receptionist | Tạo phiếu tiếp nhận (US04) |
| GET | `/api/v1/repair-jobs` | receptionist, manager | Danh sách phiếu sửa |
| GET | `/api/v1/repair-jobs/my-jobs` | mechanic | Công việc của thợ (US08) |
| PUT | `/api/v1/repair-jobs/:id/assign` | manager, receptionist | Phân công thợ (US07) |
| PUT | `/api/v1/repair-jobs/:id/status` | receptionist, manager, mechanic | Cập nhật trạng thái |
| DELETE | `/api/v1/repair-jobs/:id` | receptionist, manager, admin | Xóa phiếu đủ điều kiện; giữ lại phiếu có dữ liệu kho/tài chính hoặc đã được duyệt |
| PUT | `/api/v1/repair-jobs/:id/diagnosis` | mechanic | Ghi chẩn đoán (US06) |
| GET | `/api/v1/spare-parts` | người dùng đã xác thực | Danh sách phụ tùng kho; quản lý dịch vụ được quyền xem |
| POST | `/api/v1/spare-parts/:id/import` | warehouse, admin | Nhập hàng vào kho |
| GET | `/api/v1/estimates/my` | customer | Báo giá thuộc hồ sơ khách đang đăng nhập |
| PUT | `/api/v1/estimates/:id/approve` | customer sở hữu báo giá | Đồng ý báo giá, chuyển phiếu sang `approved` |
| PUT | `/api/v1/estimates/:id/reject` | customer sở hữu báo giá | Từ chối báo giá và hủy phiếu |
| GET | `/api/v1/services` | all | Danh mục dịch vụ sửa chữa |
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
