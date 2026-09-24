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


## Database foundation (tuần 1 - Đức)

Cần cài Docker Desktop và khởi động Docker trước khi chạy các lệnh dưới đây.

1. Sao chép `.env.example` thành `.env` và đặt mật khẩu riêng trong `.env`.
2. Khởi chạy PostgreSQL:

   ```powershell
   docker compose -f compose.db.yaml up -d
   ```

3. Trên PowerShell, tạo ba bảng nền (chạy một lần trên database mới):

   ```powershell
   Get-Content .\database\migrations\001_init.sql -Raw | docker compose -f compose.db.yaml exec -T db psql -X -v ON_ERROR_STOP=1 -1 -U workshop -d workshop_db
   ```

4. Kiểm tra danh sách bảng:

   ```powershell
   docker compose -f compose.db.yaml exec db psql -U workshop -d workshop_db -c "\dt"
   ```

Kết quả cần có: `users`, `customers`, `vehicles`.

ERD toàn hệ thống nằm tại `database/ERD.md`. Trong tuần 1, mới chỉ có ba bảng nền được tạo trong PostgreSQL.
