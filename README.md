# Automotive Repair Workshop Management System

Ứng dụng web quản lý quy trình gara ô tô: tiếp nhận xe, phân công kỹ thuật viên, chẩn đoán, báo giá, sửa chữa, quản lý phụ tùng, lập hóa đơn và theo dõi thanh toán. Dự án được xây dựng cho môn Công nghệ phần mềm (504011), Topic 12, Trường Đại học Tôn Đức Thắng.

## Nội dung

- [Tính năng](#tính-năng)
- [Công nghệ](#công-nghệ)
- [Bắt đầu](#bắt-đầu)
- [Tài khoản demo](#tài-khoản-demo)
- [Vai trò](#vai-trò)
- [Tài chính và kho](#tài-chính-và-kho)
- [API](#api)
- [Kiểm thử](#kiểm-thử)
- [Cấu trúc dự án](#cấu-trúc-dự-án)

## Tính năng

- Đăng nhập bằng JWT, đăng ký tài khoản khách hàng và quản lý quyền theo vai trò.
- Quản lý khách hàng, phương tiện, lịch sử sửa chữa và lịch hẹn tiếp nhận.
- Tiếp nhận xe, tạo phiếu sửa chữa, phân công thợ máy, ghi chẩn đoán và cập nhật tiến độ.
- Lập báo giá, cho khách hàng duyệt hoặc từ chối, xuất hóa đơn và ghi nhận thanh toán tiền mặt, chuyển khoản hoặc POS.
- Quản lý tồn kho, cảnh báo phụ tùng sắp hết và ghi nhận phụ tùng đã dùng theo phiếu.
- Thu hồi phụ tùng ghi nhầm khi phiếu còn đang sửa: trả số lượng về kho và lưu biến động đảo chiều. Không cho thu hồi khi phiếu đã hoàn thành hoặc có hóa đơn.
- Quản lý ca, đối soát tiền mặt/chuyển khoản/POS, xem lịch sử thu chi và quản lý công nợ nhập kho.

## Công nghệ

| Tầng | Công nghệ |
|---|---|
| Frontend | React 19, Vite, React Router 7, Axios |
| Backend | Node.js, Express 5, kiến trúc routes → controllers → services |
| Database | PostgreSQL 16, migrations SQL, transaction và truy vấn tham số hóa |
| Xác thực | JWT HS256, bcrypt, RBAC 6 vai trò |
| API | OpenAPI 3.1 tại [`api/openapi.yaml`](api/openapi.yaml) |
| Kiểm thử | Node.js test runner, PostgreSQL integration tests, Playwright E2E |
| Chạy dịch vụ | Docker Compose: PostgreSQL, backend, frontend/Nginx |

## Bắt đầu

Yêu cầu: Docker Desktop có Docker Compose, hoặc Node.js 22+ và PostgreSQL 16.

### Docker Compose

Mở Docker Desktop, đợi Docker Engine chạy, rồi mở PowerShell tại thư mục dự án. Chỉ tạo `.env` nếu dự án chưa có file này; điền `DB_USER`, `DB_PASSWORD` và `JWT_SECRET` (chuỗi ngẫu nhiên tối thiểu 32 ký tự):

```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
notepad .env
```

Khởi động toàn bộ dịch vụ và theo dõi log:

```powershell
docker compose up -d --build
docker compose ps
docker compose logs -f db-setup backend frontend
```

Mở frontend tại [http://localhost:8080](http://localhost:8080). Kiểm tra API qua [http://localhost:8080/api/health](http://localhost:8080/api/health); cổng backend trực tiếp là giá trị `PORT` trong `.env` (mặc định `3000`). Compose đợi PostgreSQL khỏe, chạy migrations và seeds trong `db-setup`, rồi mới khởi động backend và frontend. Vì vậy đăng nhập demo đã có dữ liệu ngay cả khi dùng volume database cũ.

Đăng nhập mẫu (mật khẩu chung `123456`):

- Admin: `admin@workshop.vn`
- Lễ tân: `dung.receptionist@workshop.vn`
- Thợ máy: `hieu.mechanic@workshop.vn`
- Quản lý dịch vụ: `minh.manager@workshop.vn`
- Nhân viên kho: `ngoc.warehouse@workshop.vn`

PostgreSQL được publish ở cổng `5432`. Dừng dịch vụ mà vẫn giữ dữ liệu bằng `docker compose down`; khởi động lại bằng `docker compose up -d`. Không dùng `docker compose down -v` nếu muốn giữ database.

### Chạy frontend và backend riêng

Tạo/cấu hình `.env` ở thư mục gốc, bảo đảm PostgreSQL đang chạy, rồi cài dependency:

```bash
npm ci --prefix backend
npm ci --prefix frontend
node backend/src/scripts/setupDb.js
```

Chạy backend và frontend ở hai terminal:

```bash
npm run dev:backend
npm run dev:frontend
```

Backend mặc định chạy ở `http://localhost:3000`; Vite chạy ở `http://localhost:5173` và proxy `/api` tới backend. Có thể đổi backend origin và Vite port qua `VITE_BACKEND_ORIGIN`, `VITE_DEV_SERVER_PORT` trong `frontend/.env`.

### Biến môi trường

| Biến | Bắt buộc | Mặc định / mục đích |
|---|---|---|
| `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Có | Tài khoản và database PostgreSQL |
| `DB_HOST`, `DB_PORT` | Không | `localhost`, `5432`; trong Docker backend dùng host `db` |
| `JWT_SECRET` | Có | Secret ký JWT, nên dùng chuỗi ngẫu nhiên tối thiểu 32 ký tự |
| `JWT_EXPIRES_IN` | Không | `8h` |
| `PORT` | Không | `3000` cho backend |
| `VAT_RATE` | Không | `0.10`; hỗ trợ giá trị `0` |
| `DB_SUPERUSER`, `DB_SUPERUSER_PASSWORD`, `DB_SUPERDATABASE` | Không | Dùng bởi script setup khi cần tạo database/role; thiếu mật khẩu có thể nhập theo lời nhắc |
| `VITE_BACKEND_ORIGIN` | Không | `http://localhost:3000`, dùng bởi proxy Vite |
| `VITE_DEV_SERVER_PORT` | Không | `5173`, cổng Vite trong môi trường local |
| `VITE_BANK_ID`, `VITE_BANK_NAME`, `VITE_BANK_ACCOUNT_NO`, `VITE_BANK_ACCOUNT_NAME`, `VITE_BANK_STORE`, `VITE_BANK_QR_TEMPLATE` | Không | Thông tin tài khoản công khai để tạo QR chuyển khoản |

Chỉ đưa thông tin công khai vào biến `VITE_*`; các giá trị này được đóng gói và gửi tới trình duyệt. Không đặt DB password hoặc JWT secret trong `frontend/.env`.

## Tài khoản demo

Các tài khoản dưới đây được thêm bởi `database/seeds/002_full_demo_data.sql`. Mật khẩu seed là `123456`; chỉ dùng cho môi trường demo/local.

| Vai trò | Email |
|---|---|
| Lễ tân | `dung.receptionist@workshop.vn` |
| Lễ tân | `duc.receptionist@workshop.vn` |
| Thợ máy | `hieu.mechanic@workshop.vn` |
| Thợ máy | `khoa.mechanic@workshop.vn` |
| Quản lý dịch vụ | `minh.manager@workshop.vn` |
| Nhân viên kho | `ngoc.warehouse@workshop.vn` |
| Quản trị viên | `admin@workshop.vn` |

Seed không tạo sẵn tài khoản khách hàng. Có thể đăng ký khách hàng qua `/login` hoặc `POST /api/v1/auth/register`.

## Vai trò

| Vai trò | Quyền chính |
|---|---|
| `customer` | Quản lý tài khoản của mình; đặt lịch; xem lịch sử, báo giá, hóa đơn và trạng thái xe thuộc hồ sơ đã liên kết |
| `receptionist` | Tiếp nhận xe; quản lý khách hàng và xe; phân công; lập báo giá; xuất hóa đơn, thu tiền; mở/chốt ca; ghi phiếu chi thường |
| `service_manager` | Theo dõi phiếu, phân công; quản lý mặt hàng/nhập kho; xem giá vốn; xem lịch sử ca; phê duyệt khoản chi; pay-in/payout và payout công nợ từ quỹ ca |
| `mechanic` | Xem phiếu được giao; ghi chẩn đoán; cập nhật tiến độ; ghi nhận hoặc thu hồi phụ tùng đã dùng khi phiếu còn đang sửa |
| `warehouse_staff` | Quản lý mặt hàng và tồn kho; nhập hàng; xem giá nhập và giá sửa chữa; thu hồi phụ tùng đã ghi nhận khi đủ điều kiện |
| `admin` | Quản trị người dùng/vai trò; thao tác quản lý gara và kho; pay-in/payout; xử lý công nợ bằng nguồn ngoài khi đủ điều kiện |

Quyền được xác thực ở cả router backend và giao diện. API kho trả giá áp dụng sửa chữa cho các vai trò đã đăng nhập để lập hoặc xem báo giá; trường giá nhập chỉ trả cho `warehouse_staff`, `service_manager` và `admin`.

## Tài chính và kho

- Mỗi lần nhập kho ghi số lượng, giá nhập theo đơn vị và tổng giá trị nhập; giá áp dụng sửa chữa được lưu riêng.
- Nếu quỹ có đủ tiền thu tiền mặt/pay-in sau các khoản đã payout, giá trị nhập được payout tự động. Nếu chưa đủ, hệ thống tạo công nợ và giữ khoản này qua ca tiếp theo.
- Quản lý dịch vụ và admin có thể payout công nợ từ quỹ ca khi số dư cho phép. Admin có thể tất toán bằng nguồn ngoài sau khi cả hai ca của ngày công nợ đã chốt và không còn ca đang mở.
- Pay-in và payout thường chỉ dành cho quản lý dịch vụ/admin. Payout không được vượt số tiền thu/pay-in còn lại sau chi; tiền gốc mở ca không được tính vào hạn mức payout.
- Khi chốt ca, quỹ lý thuyết gồm tiền gốc, tiền mặt thu, pay-in và các khoản chi. Tiền nộp két được tính từ tiền mặt kiểm kê trừ tiền gốc; pay-in được báo cáo riêng với doanh thu bán hàng.
- Thu hồi phụ tùng đã dùng chỉ thực hiện khi phiếu còn `in_repair` và chưa có hóa đơn. Backend khóa phiếu, dòng phụ tùng và mặt hàng trong transaction, cộng lại tồn kho, ghi biến động `reversal` rồi xóa dòng sử dụng.

## API

API có tiền tố `/api/v1`; ngoại trừ đăng nhập, đăng ký và `GET /` hoặc `GET /api/health`, request cần header `Authorization: Bearer <token>`.

| Nhóm | Endpoint tiêu biểu |
|---|---|
| Auth/profile | `POST /auth/login`, `POST /auth/register`, `GET/PATCH /auth/me`, `POST /auth/change-password` |
| Khách hàng/xe | `/customers`, `/vehicles`, `GET /vehicles/:id/repair-history` |
| Lịch hẹn | `GET/POST /appointments`, `PUT /appointments/:id/decision`, `POST /appointments/:id/customer-decision`, `POST /appointments/:id/check-in` |
| Phiếu sửa chữa | `/repair-jobs`, `GET /repair-jobs/my-jobs`, `PUT /repair-jobs/:id/assign`, `PUT /repair-jobs/:id/diagnosis`, `PUT /repair-jobs/:id/status` |
| Báo giá | `POST /estimates`, `GET /estimates/my`, `PUT /estimates/:id/approve`, `PUT /estimates/:id/reject` |
| Kho | `/spare-parts`, `POST /spare-parts/:id/import`, `POST /spare-parts/:id/deduct`, `DELETE /spare-parts/usage/:usedPartId` |
| Cảnh báo kho | `GET /spare-parts/low-stock` |
| Hóa đơn | `POST /invoices`, `GET /invoices/my`, `GET /invoices/:id`, `PUT /invoices/:id/pay` |
| Thông báo | `GET /notifications`, `POST /notifications/:id/read`, `POST /notifications/read-all` |
| Ca và quỹ | `GET /shifts/current`, `POST /shifts/open`, `POST /shifts/transactions`, `POST /shifts/cash-movements`, `POST /shifts/close` |
| Công nợ kho | `GET /shifts/inventory-payables`, `POST /shifts/inventory-payables/:payableId/payout` |
| Báo cáo | `GET /shifts`, `GET /shifts/:id`, `GET /api/health` |

Xem hợp đồng OpenAPI tại [`api/openapi.yaml`](api/openapi.yaml). Một số API tài chính/kho yêu cầu role cụ thể; xem `backend/src/routes` để biết đầy đủ RBAC.

## Kiểm thử

```bash
# Unit tests
npm test

# Unit tests với coverage gate (60% cho business logic được cấu hình)
npm run test:coverage --prefix backend

# PostgreSQL API integration tests
npm run test:integration

# Unit + integration
npm run test:all

# Playwright browser E2E
npm ci --prefix frontend
npx playwright install chromium
npm run test:e2e --prefix frontend
```

Integration/E2E cần một database riêng, không dùng database demo. `DB_NAME` phải có `test` trong tên; dùng `.env` trỏ vào database test rồi chạy `node backend/src/scripts/setupDb.js` để áp dụng migrations và dữ liệu cần thiết trước khi test. Có thể tạm đặt tên database qua biến môi trường:

```powershell
$env:DB_NAME = 'workshop_test_db'
node backend/src/scripts/setupDb.js
npm run test:integration
```

Sau khi kiểm thử, bỏ biến tạm hoặc khôi phục cấu hình database phát triển:

```powershell
Remove-Item Env:DB_NAME
```

Integration test được chạy tuần tự vì các test dùng chung database fixtures. Playwright tự khởi động backend và Vite, nhưng cần PostgreSQL test đã sẵn sàng.

GitHub Actions chạy frontend lint/build, backend unit tests, coverage, API integration, health check và Playwright E2E.

## Cấu trúc dự án

```text
.
├── .github/workflows/ci.yml
├── api/openapi.yaml
├── backend/src/
│   ├── config/          # Database và môi trường
│   ├── controllers/     # HTTP handlers
│   ├── middleware/      # JWT, RBAC, validation, error handler
│   ├── routes/          # API routes và quyền truy cập
│   ├── scripts/         # Khởi tạo database/migrations/seeds
│   ├── services/        # Nghiệp vụ và truy vấn PostgreSQL
│   └── utils/           # Pricing và workflow validation
├── database/
│   ├── migrations/      # 001–025
│   └── seeds/           # Dữ liệu demo
├── frontend/src/
│   ├── components/
│   ├── pages/           # admin, cashier, customer, inventory, mechanic, reception
│   ├── routes/
│   └── services/
├── frontend/e2e/
├── tests/
│   ├── integration/
│   └── unit/
├── docker-compose.yml
└── package.json
```

Schema thay đổi được quản lý bằng các file tuần tự `database/migrations`. Các điểm bổ sung gần đây: migration `024` thêm giá vốn/công nợ nhập kho và pay-in; migration `025` thêm audit biến động khi thu hồi phụ tùng.

## Thành viên

| Thành viên | MSSV | Vai trò |
|---|---|---|
| Dương Đình Đức | 52400109 | Trưởng nhóm, Frontend Lead |
| Lưu Nhật Quang | 52400229 | Backend API & Services Lead |
| Phùng Nguyễn Hoàng Khôi | 52400206 | Database & Security Lead |
| Tăng Duy Việt | 52400255 | QA & Testing Lead |
