
# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
# Automotive Repair Workshop Management System

## 1. Giới thiệu

Automotive Repair Workshop Management System là hệ thống web hỗ trợ quản lý
quy trình sửa chữa ô tô tại xưởng.

Hệ thống quản lý từ khi tiếp nhận xe, tạo việc sửa chữa, phân công thợ,
cập nhật tiến độ, quản lý phụ tùng, báo giá, tính chi phí và tạo hóa đơn.

## 2. Mục tiêu

- Quản lý khách hàng và phương tiện.
- Quản lý quy trình sửa chữa.
- Phân công và theo dõi công việc của thợ.
- Quản lý phụ tùng và tồn kho.
- Tạo báo giá và hóa đơn.
- Quản lý đăng nhập, vai trò và quyền.
- Hỗ trợ kiểm thử tự động và CI/CD.

## 3. Thành viên

| Thành viên | MSSV | Vai trò |
|---|---|---|
| Dương Đình Đức | 52400109 | Reception UI |
| Lưu Nhật Quang | 52400229 | API và dịch vụ |
| Phùng Nguyễn Hoàng Khôi | 52400206 | Database và bảo mật |
| Tăng Duy Việt | 52400255 | Testing và Integration |

## 4. Công nghệ dự kiến

- Frontend: React/Vite hoặc Vue.js
- Backend: Express
- Database: PostgreSQL
- API: RESTful API
- Testing: Unit / API / E2E
- CI/CD: GitHub Actions
- Deployment: Docker hoặc nền tảng phù hợp

## 5. Git Workflow

Issue
→ Branch
→ Code
→ Commit
→ Push
→ Pull Request
→ Review
→ Merge

## 6. Project Status

Project đang được phát triển theo Agile/Scrum trong 8 tuần.


## Database setup (tuần 1–2 - Đức)

Cài và khởi động Docker Desktop trước khi chạy các lệnh. Sao chép
`.env.example` thành `.env` và đặt mật khẩu riêng trong `.env`.

Khởi chạy PostgreSQL:

```powershell
docker compose -f compose.db.yaml up -d
```

Trên **database mới**, chạy từng migration theo thứ tự, mỗi file một lần:

```powershell
Get-Content .\database\migrations\001_init.sql -Raw | docker compose -f compose.db.yaml exec -T db psql -X -v ON_ERROR_STOP=1 -1 -U workshop -d workshop_db
Get-Content .\database\migrations\002_customers_vehicles.sql -Raw | docker compose -f compose.db.yaml exec -T db psql -X -v ON_ERROR_STOP=1 -1 -U workshop -d workshop_db
```

Kiểm tra danh sách bảng:

```powershell
docker compose -f compose.db.yaml exec db psql -U workshop -d workshop_db -c "\dt"
```

Kết quả cần có: `users`, `customers`, `vehicles`.

Để nạp dữ liệu mẫu **một lần** vào database mới:

```powershell
Get-Content .\database\seeds\001_customers_vehicles.sql -Raw | docker compose -f compose.db.yaml exec -T db psql -X -v ON_ERROR_STOP=1 -1 -U workshop -d workshop_db
```

Chạy các query kiểm tra:

```powershell
Get-Content .\database\queries\001_check_customers_vehicles.sql -Raw | docker compose -f compose.db.yaml exec -T db psql -X -P pager=off -v ON_ERROR_STOP=1 -U workshop -d workshop_db
```

Database đã được tạo bằng phiên bản `001_init.sql` cũ vốn có đủ ba bảng thì
**không chạy lại** `001` hoặc `002` trên database đó. Hãy dùng một database
thử mới để kiểm tra chuỗi migration. ERD toàn hệ thống nằm tại `database/ERD.md`.