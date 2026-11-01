# Automotive Repair Workshop Management System

Hệ thống web hỗ trợ gara quản lý quy trình sửa chữa ô tô từ lúc tiếp nhận xe đến khi hoàn tất hóa đơn và thanh toán. Dự án thuộc đồ án môn **Công nghệ phần mềm (504011), Topic 12 — Đại học Tôn Đức Thắng**.

> **Luồng nghiệp vụ:** Tiếp nhận xe → phân công thợ → chẩn đoán → lập báo giá → khách duyệt → sửa chữa và trừ kho → hoàn tất → xuất hóa đơn → ghi nhận thanh toán.

## Chức năng

- **Khách hàng và phương tiện:** quản lý hồ sơ khách, xe, đăng ký tài khoản khách hàng và lịch sử sửa chữa.
- **Tiếp nhận và sửa chữa:** lập phiếu sửa chữa, ghi nhận yêu cầu, phân công thợ, chẩn đoán và cập nhật trạng thái theo quy trình.
- **Kho phụ tùng:** quản lý tồn kho, ghi nhận nhập/xuất, trừ tồn khi sử dụng phụ tùng và cảnh báo tồn thấp.
- **Báo giá và tài chính:** lập báo giá theo dịch vụ và phụ tùng, tính thuế VAT, cho khách đồng ý/từ chối báo giá, xuất hóa đơn và ghi nhận thanh toán.
- **Cổng khách hàng:** xem trạng thái và lịch sử xe, xem báo giá thuộc hồ sơ đã liên kết.
- **Tài khoản và phân quyền:** đăng nhập JWT, kiểm soát quyền tại API và giao diện theo vai trò.

### Vai trò

| Vai trò | Phạm vi chính |
|---|---|
| `customer` | Xem trạng thái xe, lịch sử và xử lý báo giá thuộc hồ sơ của mình |
| `receptionist` | Tiếp nhận xe, quản lý khách/xe, lập báo giá và xử lý hóa đơn |
| `service_manager` | Theo dõi và phân công công việc sửa chữa |
| `mechanic` | Xem việc được giao, chẩn đoán và cập nhật tiến độ |
| `warehouse_staff` | Quản lý kho và nhập phụ tùng |
| `admin` | Quản trị người dùng và các nghiệp vụ quản trị |

Các quyền chi tiết được mô tả trong [ma trận yêu cầu](docs/requirements.md).

## Công nghệ và kiến trúc

| Thành phần | Công nghệ |
|---|---|
| Giao diện | React 19, Vite, React Router 7, Axios |
| API | Node.js 22, Express 5, kiến trúc routes → controllers → services |
| Cơ sở dữ liệu | PostgreSQL 16, SQL migrations và seed data |
| Hợp đồng API | OpenAPI 3.1 tại [api/openapi.yaml](api/openapi.yaml) |
| Xác thực | JWT, bcryptjs và RBAC 6 vai trò |
| Kiểm thử | Node.js Test Runner, integration tests với PostgreSQL, Playwright, c8 |
| Môi trường | Docker Compose cho PostgreSQL, backend và frontend |
| CI | GitHub Actions: lint/build frontend, unit test, coverage, API integration và browser E2E |

Backend giữ nghiệp vụ trong service layer; truy vấn dùng tham số SQL và các thao tác cần tính nhất quán được thực hiện trong transaction. Schema và lịch sử thay đổi cơ sở dữ liệu nằm trong `database/migrations/`. Cấu hình nhạy cảm được đọc từ biến môi trường; chỉ các file `.env.example` được đưa lên Git.

### Tổ chức mã nguồn

```text
api/openapi.yaml                 Hợp đồng REST API
backend/src/
  config/                         Cấu hình DB và môi trường
  middleware/                     JWT, RBAC, validation, xử lý lỗi
  routes/                         Khai báo endpoint
  controllers/                    Điều phối request/response
  services/                       Nghiệp vụ và truy vấn dữ liệu
  utils/                          Tính giá và quy tắc workflow
frontend/src/
  components/                     Thành phần giao diện dùng chung
  context/                        Trạng thái xác thực
  pages/                          Trang theo vai trò/nghiệp vụ
  routes/                         Điều hướng và bảo vệ route
  services/api.js                 Kết nối API
database/
  migrations/                     Thay đổi schema theo thứ tự
  seeds/                          Dữ liệu mẫu
docs/                             Yêu cầu, sprint, DoD, ERD và sơ đồ
tests/
  unit/                           Kiểm thử nghiệp vụ và middleware
  integration/                    Kiểm thử API với PostgreSQL
frontend/e2e/                     Kiểm thử trình duyệt bằng Playwright
.github/workflows/ci.yml          Pipeline CI
```

## Chạy dự án

### Dùng Docker Compose

Cần Docker Desktop với Docker Compose. Tạo file cấu hình cục bộ từ mẫu, điền thông tin database và JWT secret, sau đó chạy:

```powershell
Copy-Item .env.example .env
# Mở .env và đặt DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET
docker compose up --build -d
```

- Frontend: http://localhost:8080
- Backend health check: http://localhost:3000/api/health
- PostgreSQL: `localhost:5432`

Compose khởi chạy ba dịch vụ `db`, `backend`, `frontend`; các migration được áp dụng khi khởi tạo database mới. Dữ liệu PostgreSQL được giữ trong named volume.

### Chạy frontend/backend riêng

Cần Node.js 22 và PostgreSQL. Cấu hình kết nối DB, `JWT_SECRET` và các biến cần thiết trong `.env` ở thư mục gốc hoặc `backend/.env`, rồi cài dependencies và chạy:

```bash
npm ci --prefix backend
npm ci --prefix frontend
npm run dev:backend
npm run dev:frontend
```

Backend mặc định chạy tại cổng 3000; Vite chạy tại cổng 5173. Dùng `khoi_tao_database.bat` trên Windows để mở script khởi tạo database, hoặc chạy migrations theo thứ tự trong `database/migrations/`. Không đưa file `.env`, mật khẩu thật hoặc JWT secret vào commit.

## Kiểm thử

Chạy từ thư mục gốc dự án:

```bash
npm test
npm run test:integration
npm run test:coverage --prefix backend
npm run lint --prefix frontend
npm run build --prefix frontend
npm run test:e2e --prefix frontend
```

Integration và E2E cần một PostgreSQL **riêng cho test** đã được migrate; tên database phải chứa `test` để tránh chạy nhầm vào dữ liệu demo. CI tự tạo PostgreSQL dùng riêng cho từng run.

### Trạng thái kiểm thử gần nhất

- **105/105 unit tests** đạt.
- **18/18 API integration tests** đạt.
- **2/2 Playwright E2E tests** đạt.
- Coverage gate kiểm tra line, statement, function và branch ở mức tối thiểu **60%** cho các phần business logic được cấu hình.
- CI của commit merge PR #44 vào `main` (run #54) xanh; CI của PR #45 (run #55) cũng xanh tại thời điểm cập nhật README.

## Cập nhật công việc tuần 5 — 01/11/2026

PR [#44](https://github.com/52400255-dot/Automotive-Repair-Workshop-Management-System/pull/44) đã được review, merge vào `main` và CI thành công. Các phần chính trong tuần:

- Bổ sung coverage gate và unit tests cho RBAC/business logic; mở rộng API integration tests và Playwright E2E cho quản lý vai trò.
- Củng cố phân quyền theo role hiện tại, liên kết tài khoản khách hàng với hồ sơ đúng email/số điện thoại và giới hạn việc duyệt báo giá theo quyền sở hữu.
- Bổ sung xóa phiếu sửa chữa an toàn bằng transaction; từ chối xóa khi phiếu đã có dữ liệu sửa chữa, phụ tùng hoặc tài chính cần giữ lại.
- Giữ dữ liệu database qua lần khởi động lại Docker bằng named volume; cập nhật API contract và các lỗi giao diện được phát hiện khi kiểm thử.

PR [#45](https://github.com/52400255-dot/Automotive-Repair-Workshop-Management-System/pull/45) đang chờ review tại thời điểm ghi tài liệu: hoàn thiện luồng giao diện quản lý role bằng cách tải lại danh sách từ API sau khi cập nhật và xác nhận trạng thái được lưu. Không tính phần này là thay đổi đã merge vào `main`.

## Quy trình đóng góp

1. Tạo hoặc chọn Issue và xác định tiêu chí nghiệm thu.
2. Tạo nhánh công việc từ `main`, theo quy ước `feature/USxx-ten-ngan` (dùng tiền tố phù hợp như `docs/` cho tài liệu).
3. Thực hiện thay đổi, kiểm tra diff và chạy các kiểm tra phù hợp với phạm vi.
4. Commit với mô tả rõ ràng, ví dụ `feat(sprint-N): ...`, `fix(module): ...`, `test: ...`, `docs: ...`.
5. Push nhánh và mở Pull Request về `main`; liên kết Issue bằng `Closes #<n>`.
6. Chờ ít nhất một reviewer approve và CI xanh trước khi merge; sau khi merge mới đóng Issue.

Không push trực tiếp thay đổi công việc lên nhánh chung. Xem thêm [Sprint Plan](docs/sprint-plan.md), [Definition of Done](docs/definition-of-done.md) và [PR template](.github/PULL_REQUEST_TEMPLATE.md).

## Tài liệu

- [Tổng quan kiến trúc](docs/01-overview.md)
- [Yêu cầu và ma trận RBAC](docs/requirements.md)
- [Product backlog](docs/backlog.md)
- [Kế hoạch Sprint](docs/sprint-plan.md)
- [Definition of Done](docs/definition-of-done.md)
- [ERD cơ sở dữ liệu](docs/erd.md)
- [OpenAPI](api/openapi.yaml)

## Nhóm thực hiện

Đồ án môn Công nghệ phần mềm — Đại học Tôn Đức Thắng.

| Thành viên | MSSV | Phụ trách |
|---|---:|---|
| Dương Đình Đức | 52400109 | Frontend |
| Lưu Nhật Quang | 52400229 | Backend API và services |
| Phùng Nguyễn Hoàng Khôi | 52400206 | Database và bảo mật |
| Tăng Duy Việt | 52400255 | QA và kiểm thử |
