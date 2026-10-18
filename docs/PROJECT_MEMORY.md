# PROJECT MEMORY — Automotive Repair Workshop Management System

Tài liệu lưu trữ trạng thái, kiến trúc, quyết định kỹ thuật và tiến độ thực tế của dự án.
Cập nhật: 17/10/2026 (Sprint 3 / Tuần 3)

---

## 1. Thông tin chung dự án
- **Đề tài**: Đồ án Công nghệ phần mềm — Hệ thống quản lý gara sửa chữa ô tô (Topic 12).
- **Mô hình phát triển**: Agile / Scrum (8 Sprint / 8 Tuần).
- **Công nghệ chính**:
  - **Frontend**: React 19, Vite, React Router DOM v7, Axios.
  - **Backend**: Node.js, Express 5 (Kiến trúc 3 tầng: Routes -> Controllers -> Services), PostgreSQL (thư viện `pg`), JWT (jsonwebtoken), bcryptjs, CORS.
  - **Database**: PostgreSQL 16 (14 migrations + seeds + Stored Procedures nguyên tử).
  - **API Contract**: OpenAPI 3.1 (`api/openapi.yaml`).
  - **Testing**: Node.js Test Runner tích hợp (`node:test`, `node:assert/strict`).

---

## 2. Nhật ký hiện trạng ban đầu & Vấn đề đã phát hiện (Audit)
Báo cáo hiện trạng ban đầu có nhiều điểm "tô hồng" không đúng với code thực tế:
1. **Login (US16)**: Frontend dùng `mockUsers.js` và tự lưu `mock-jwt-token-admin`, không hề gọi API backend `/api/v1/auth/login`. Role trong mock viết hoa (`Admin`, `Mechanic`), gây lỗi phân quyền ở `ProtectedRoute`.
2. **Dashboard Logout Bug**: Dashboard tự gọi `/repair-jobs` (chỉ dành cho lễ tân/quản lý/admin). Thợ máy (`mechanic`) vào dashboard gặp 403 -> Axios interceptor tự xóa token và đá văng về login.
3. **Tiếp nhận xe (US04, US05)**: Giao diện gọi `/services` và `/inventory` không tồn tại ở backend; payload gửi lên thiếu trường `serviceItems`, làm mất toàn bộ dịch vụ khi tạo phiếu.
4. **Phân công thợ & Chẩn đoán (US06, US07)**: Dùng `window.prompt()` sơ sài, không có danh sách thợ để chọn.
5. **Thiếu API dịch vụ**: Bảng `services` có trong DB nhưng backend chưa có router `services.routes.js`.
6. **Báo cáo, Hóa đơn (US13, US14, US15)**: Frontend chưa làm hoặc chỉ có mockup tĩnh 39 dòng không có sự kiện.

---

## 3. Mục tiêu Sprint Tuần 3 (Sprint 3)
Triển khai hoàn chỉnh và kiểm thử luồng sửa chữa: **Tiếp nhận xe (US04) -> Phân công thợ (US07) -> Xem việc được giao (US08) -> Cập nhật chẩn đoán (US06)**.

| User Story | Phân công vai trò | Mục tiêu cụ thể trong Tuần 3 |
|---|---|---|
| **US04: Tiếp nhận xe** | M1 (UI) + M2 (API) + M3 (DB) | Lễ tân chọn khách hàng, chọn xe, chọn dịch vụ từ API, nhập mô tả triệu chứng và tạo phiếu thành công với Stored Procedure. |
| **US07: Phân công thợ** | M1 (UI) + M2 (API) | Quản lý / Lễ tân xem danh sách thợ máy từ API, mở Modal phân công kỹ thuật viên cho phiếu sửa chữa đang chờ (`pending`). |
| **US08: Xem việc được giao** | M1 (UI) + M2 (API) | Thợ máy xem danh sách phiếu được phân công cho mình tại Task Board (`/repair-jobs/my-jobs`). |
| **US06: Cập nhật chẩn đoán** | M1 (UI) + M2 (API) | Thợ máy nhập kết quả chẩn đoán và đề xuất sửa chữa qua Form/Modal chuyên nghiệp, lưu vào bảng `diagnoses` và chuyển trạng thái phiếu. |
| **US18: Automated Testing** | M4 (QA/DevOps) | Viết bộ kiểm thử tích hợp (Integration Test) chạy tự động toàn bộ luồng: Tiếp nhận -> Phân công -> Chẩn đoán. |

---

## 4. Chi tiết các công việc đã xử lý trong Sprint Tuần 3

### A. Khắc phục lỗi nền tảng (Foundation Fixes)
1. **Xóa Mock Auth & Chuyển sang Real JWT Auth (US16)**:
   - File xóa: `frontend/src/mocks/mockUsers.js`.
   - File sửa: `frontend/src/pages/LoginPage.jsx`.
   - Chuyển `LoginPage` sang gọi trực tiếp `useAuth().login(email, password)` đến backend `/api/v1/auth/login`. Thêm các nút demo nhanh với tài khoản thật trong database seed (`dung.receptionist@workshop.vn`, `hieu.mechanic@workshop.vn`, `minh.manager@workshop.vn`, `admin@workshop.vn` / mật khẩu: `123456`).
2. **Khắc phục lỗi 403 gây văng phiên (Logout Loop) tại Dashboard**:
   - File sửa: `frontend/src/pages/DashboardPage.jsx`.
   - Kiểm tra vai trò `user.role` trước khi gọi `/repair-jobs` và `/spare-parts/low-stock`, giúp thợ máy (`mechanic`) và thủ kho (`warehouse_staff`) truy cập trang chủ mà không bị chặn 403 và bị đá văng về login.

### B. Hoàn thiện tính năng Tuần 3 theo yêu cầu (US04, US06, US07, US08)
1. **Danh mục dịch vụ (Dịch vụ cho US04)**:
   - File mới:
     - `database/migrations/015_seed_initial_services.sql`: Cung cấp 5 dịch vụ sửa chữa chuẩn có sẵn giá.
     - `backend/src/services/service.service.js` & `controllers/service.controller.js` & `routes/service.routes.js`: Cung cấp API `GET /api/v1/services`.
   - File sửa: `backend/src/server.js`: Mount route `/api/v1/services`.
2. **Tiếp nhận xe & Tạo phiếu sửa chữa (US04)**:
   - File sửa: `frontend/src/pages/reception/ReceptionPage.jsx`:
     - Tải danh mục dịch vụ thật từ `/api/v1/services`.
     - Sửa lỗi state checkbox phụ tùng bị dính chùm với dịch vụ.
     - Chuẩn hóa payload gửi lên backend dạng `serviceItems: [{ serviceId, quantity }]` để Stored Procedure `create_repair_job_with_services` ghi nhận đúng dịch vụ vào bảng `repair_details`.
   - File sửa: `backend/src/routes/vehicle.routes.js`: Thêm route alias `POST /api/v1/vehicles/receive` và `POST /api/v1/vehicles/:id/receive`.
3. **Phân công thợ máy (US07)**:
   - File sửa:
     - `backend/src/services/repairJob.service.js`: Thêm hàm `getMechanics()` truy vấn người dùng có `role = 'mechanic'`.
     - `backend/src/controllers/repairJob.controller.js`: Thêm `getMechanics`.
     - `backend/src/routes/repairJob.routes.js`: Khai báo `GET /api/v1/repair-jobs/mechanics`, thêm alias `PUT /assign`.
     - `frontend/src/pages/reception/RepairJobsPage.jsx`: Thay thế hoàn toàn hàm `prompt()` bằng Modal phân công kỹ thuật viên chuyên nghiệp, tải danh sách thợ máy từ API, hỗ trợ lọc trạng thái phiếu.
4. **Xem công việc được phân công & Ghi nhận chẩn đoán (US08 & US06)**:
   - File sửa:
     - `backend/src/services/repairJob.service.js`: Cập nhật `getJobsForMechanic` trả về thêm thông tin xe, khách hàng và chẩn đoán đã ghi.
     - `frontend/src/pages/mechanic/TaskBoardPage.jsx`: Thay thế hoàn toàn 2 lần `prompt()` bằng Modal nhập kết quả chẩn đoán và đề xuất sửa chữa, hiển thị trạng thái và tiến độ sửa chữa trực quan.

### C. Kiểm thử & CI/CD (US18 - QA & DevOps)
1. **Unit Testing (US18)**:
   - File mới: `backend/src/utils/workflow.js`: Định nghĩa các hàm thuần kiểm tra chuyển đổi trạng thái và xác thực dữ liệu.
   - File mới: `tests/unit/workflow.test.js`: 18 ca unit test kiểm tra toàn diện Finite State Machine của luồng sửa chữa và validation dữ liệu tiếp nhận, chẩn đoán.
   - File sửa: `package.json` và `backend/package.json`: Cấu hình npm test chạy toàn bộ test trong `tests/unit/*.test.js`.
2. **Integration Testing (Sprint 3 E2E API)**:
   - File mới: `tests/integration/repair-workflow.test.js`: Kiểm thử tích hợp tự động toàn bộ vòng đời Tuần 3: Tiếp nhận xe -> Phân công thợ -> Thợ xem việc trên TaskBoard -> Thợ ghi nhận chẩn đoán.
3. **Đồng bộ OpenAPI Spec**:
   - File sửa: `api/openapi.yaml`: Cập nhật đặc tả API bổ sung `/services` và `/repair-jobs/mechanics`.

### D. Khắc phục lỗi Font Tiếng Việt & Chuẩn hóa Nút bấm (Encoding & Localization)
1. **Lỗi Font Dữ liệu Mẫu (`???` trong DB)**:
   - Nguyên nhân: Trước đó khi chạy lệnh nạp seed dữ liệu qua PowerShell pipe trên Windows (`cat | docker exec`), PowerShell đã tự convert các ký tự UTF-8 có dấu thành dấu `?`.
   - Khắc phục: Nạp lại toàn bộ dữ liệu mẫu sạch qua giao thức Node.js client (`fs.readFileSync(..., 'utf8')`), khôi phục 100% tiếng Việt có dấu chuẩn cho tất cả bảng (`spare_parts`, `repair_jobs`, `diagnoses`, `repair_tasks`, `services`). Thêm cờ `--reset` trong `setupDb.js`.
2. **Chuẩn hóa Tiếng Việt có dấu cho toàn bộ Nút bấm & Tiêu đề Giao diện**:
   - `Header.jsx`: Nút "Đăng xuất", hiển thị đúng tên vai trò "Lễ tân", "Thợ máy", "Quản lý dịch vụ", "Nhân viên kho", "Quản trị viên".
   - `Sidebar.jsx`: Danh mục điều hướng có dấu: "Bảng điều khiển", "Tiếp nhận xe", "Phiếu sửa chữa", "Lịch sử sửa chữa", "Bảng công việc", "Kho phụ tùng", "Khách hàng", "Cổng theo dõi khách hàng".
   - `StatusBadge.jsx`: Trạng thái phiếu có dấu: "Chờ xử lý", "Đang chẩn đoán", "Chờ duyệt báo giá", "Đang sửa chữa", "Hoàn thành", "Đã hủy"...
   - `InventoryPage.jsx`: Bảng kho phụ tùng với tiêu đề "MÃ HÀNG", "TÊN PHỤ TÙNG", "ĐƠN VỊ", "TỒN KHO", "ĐƠN GIÁ", "THAO TÁC", nút "Nhập kho", nút "Ghi nhận sử dụng", cảnh báo "Sắp hết".
   - `CustomersPage.jsx`: Tiêu đề, nhãn form và nút "Thêm khách hàng".
   - `VehicleHistoryPage.jsx`: Nút "Tìm xe", "Xem lịch sử", các cột và thông báo trạng thái có dấu đầy đủ.
   - `DashboardPage.jsx` & `StatusPortalPage.jsx`: Toàn bộ thẻ thống kê, cột bảng và thông báo đều có dấu.

### E. Khắc phục lỗi Nút "Hoàn thành sửa chữa không lưu" (Status Update Bug)
1. **Lỗi PostgreSQL Type Deduction ở API `PUT /repair-jobs/:id/status`**:
   - Triệu chứng: Khi bấm nút "Hoàn thành sửa chữa", backend trả về lỗi HTTP 500: `{"success":false,"message":"inconsistent types deduced for parameter $2"}`.
   - Nguyên nhân: Trong câu truy vấn `UPDATE repair_jobs SET status = $2, completed_at = CASE WHEN $2 = 'completed' ...`, tham số `$2` được dùng đồng thời cho cột kiểu `VARCHAR(30)` và trong mệnh đề so sánh logic `CASE WHEN`, khiến PostgreSQL không thể tự suy luận kiểu dữ liệu chuẩn xác nếu không có tham số tường minh.
   - Khắc phục: Trong `repairJob.service.js`, tách cờ `isCompleted` thành tham số boolean `$3::boolean` tường minh:
     `SET status = $2, completed_at = CASE WHEN $3::boolean THEN CURRENT_TIMESTAMP ELSE completed_at END`.
2. **Nâng cấp Trải nghiệm Bảng Công việc (Task Board - US08)**:
   - Sửa lỗi trùng lặp phiếu do các bảng quan hệ `mechanic_assignments` có nhiều lượt ghi, chuyển sang dùng `SELECT DISTINCT ON (rj.id)`.
   - Bổ sung bộ lọc trạng thái: *Tất cả công việc, Đang sửa chữa, Đang chẩn đoán, Đã duyệt, Đã hoàn thành*.
   - Khi hoàn thành sửa chữa, phiếu không biến mất mà hiển thị nhãn xanh nổi bật: `✓ Đã hoàn thành sửa chữa lúc [thời gian]` kèm thông báo thành công rõ ràng.

---

## 5. Hướng dẫn chạy và Tài khoản Test (Tất cả mật khẩu: 123456)

### Địa chỉ cổng (Ports):
- **Giao diện Web (Frontend)**: [http://localhost:5173](http://localhost:5173) (hoặc [http://localhost:8080](http://localhost:8080) nếu chạy Docker)
- **API Backend**: [http://localhost:3000/api/v1](http://localhost:3000/api/v1)
- **Cơ sở dữ liệu (PostgreSQL)**: `localhost:5432` (db: `workshop_db`, user: `workshop_user`, pass: `workshop_pass`)

### Danh sách tài khoản demo có sẵn trong hệ thống:
| Vai trò | Email đăng nhập | Mật khẩu | Chức năng kiểm thử Tuần 3 |
|---|---|---|---|
| **Lễ tân** | `dung.receptionist@workshop.vn` | `123456` | Tiếp nhận xe, tạo phiếu sửa chữa (**US04**), Phân công thợ (**US07**) |
| **Lễ tân 2** | `duc.receptionist@workshop.vn` | `123456` | Tiếp nhận xe, tạo phiếu sửa chữa |
| **Thợ máy** | `hieu.mechanic@workshop.vn` | `123456` | Xem việc được giao (**US08**), Cập nhật chẩn đoán (**US06**) |
| **Thợ máy 2** | `khoa.mechanic@workshop.vn` | `123456` | Nhận việc và cập nhật chẩn đoán |
| **Quản lý** | `minh.manager@workshop.vn` | `123456` | Xem toàn bộ phiếu, phân công kỹ thuật viên (**US07**) |
| **Thủ kho** | `ngoc.warehouse@workshop.vn` | `123456` | Xem tồn kho phụ tùng |
| **Quản trị viên** | `admin@workshop.vn` | `123456` | Toàn quyền quản trị hệ thống |

---

## 6. Danh sách các file cần commit lên Git (Git Staging Guide)

### Các file tạo mới:
- `backend/src/routes/service.routes.js`
- `backend/src/controllers/service.controller.js`
- `backend/src/services/service.service.js`
- `backend/src/utils/workflow.js`
- `backend/src/scripts/setupDb.js`
- `database/migrations/015_seed_initial_services.sql`
- `tests/unit/workflow.test.js`
- `tests/integration/repair-workflow.test.js`
- `docs/PROJECT_MEMORY.md`
- `khoi_tao_database.bat`
- `chay_backend.bat`
- `chay_frontend.bat`

### Các file đã chỉnh sửa / sửa lỗi:
- `backend/src/server.js` (Mount `/api/v1/services`, `/repairs`, `.env` absolute path)
- `backend/src/config/db.js` (Fallback biến môi trường DB)
- `backend/src/controllers/auth.controller.js` (Thêm log xác thực đăng nhập)
- `backend/src/routes/vehicle.routes.js` (Alias `/receive`)
- `backend/src/routes/repairJob.routes.js` (Endpoint `/mechanics` và `/assign`)
- `backend/src/controllers/repairJob.controller.js` (Thêm `getMechanics`)
- `backend/src/services/repairJob.service.js` (Truy vấn danh sách thợ máy & bổ sung thông tin chẩn đoán)
- `frontend/src/components/layout/Header.jsx` (Nút Đăng xuất & Vai trò có dấu)
- `frontend/src/components/layout/Sidebar.jsx` (Menu điều hướng tiếng Việt có dấu)
- `frontend/src/components/common/StatusBadge.jsx` (Badge trạng thái tiếng Việt có dấu)
- `frontend/src/pages/LoginPage.jsx` (Dùng real auth API + nút chọn nhanh tài khoản demo)
- `frontend/src/pages/DashboardPage.jsx` (Fix 403 logout loop, Tiêu đề & bảng tiếng Việt có dấu)
- `frontend/src/pages/reception/ReceptionPage.jsx` (Load real services, fix checkbox, payload `serviceItems`)
- `frontend/src/pages/reception/RepairJobsPage.jsx` (Thay `prompt` bằng Modal phân công thợ máy)
- `frontend/src/pages/reception/CustomersPage.jsx` (Thêm khách hàng, tiêu đề tiếng Việt có dấu)
- `frontend/src/pages/reception/VehicleHistoryPage.jsx` (Tìm xe, xem lịch sử sửa chữa tiếng Việt có dấu)
- `frontend/src/pages/inventory/InventoryPage.jsx` (Kho phụ tùng, nút Nhập kho, Ghi nhận sử dụng có dấu)
- `frontend/src/pages/customer/StatusPortalPage.jsx` (Cổng theo dõi khách hàng tiếng Việt có dấu)
- `frontend/src/pages/mechanic/TaskBoardPage.jsx` (Thay `prompt` bằng Modal chẩn đoán, xem công việc)
- `api/openapi.yaml` (Cập nhật tài liệu API)
- `package.json` & `backend/package.json` (Cấu hình lệnh test)

