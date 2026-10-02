# Tổng quan đề tài — Automotive Repair Workshop Management System

**Môn học:** Công nghệ phần mềm (504011) — ĐH Tôn Đức Thắng
**Đề tài:** Topic 12 — Hệ thống quản lý gara sửa chữa ô tô
**Phương pháp:** Agile/Scrum, 8 Sprint trong 8 tuần

## Bối cảnh

Thay vì quy trình thủ công (ghi sổ, gọi điện hỏi tiến độ), gara cần một nền tảng
thống nhất để tiếp nhận xe, báo giá, phân công sửa chữa và theo dõi tiến độ.

## Mục tiêu

- Chuẩn hóa quy trình tiếp nhận xe (Vehicle service intake)
- Tự động hóa tính chi phí dự kiến và xuất hóa đơn (Estimate/Invoice)
- Cập nhật tiến độ sửa chữa theo thời gian thực cho khách hàng
- Quản lý tiêu hao phụ tùng (Inventory deduction) và phân công thợ máy

## Phạm vi chức năng (7 Epics)

| Epic | Nội dung |
|---|---|
| Customer & Vehicle | Quản lý khách hàng, xe, lịch sử sửa chữa |
| Vehicle Reception & Job | Tiếp nhận xe, tạo/cập nhật phiếu sửa chữa |
| Mechanic & Repair Workflow | Phân công thợ, bảng công việc, cập nhật tiến độ |
| Spare Parts Inventory | Kho phụ tùng, trừ kho tự động, cảnh báo hết hàng |
| Estimate & Invoice | Báo giá, tính chi phí, xuất hóa đơn, thanh toán |
| Authentication & Authorization | JWT + RBAC cho 6 vai trò |
| Testing / CI/CD / Deployment | Unit test, API test, pipeline, Docker |

## Kiến trúc tổng quan

```
Browser (React SPA)
   │  HTTP/JSON
   ▼
Express REST API  ────  Middleware: JWT auth, RBAC, validation
   │
   ▼
Service layer (business logic: inventory deduction, estimate, invoice tax)
   │
   ▼
PostgreSQL (14 bảng, xem docs/erd.md)
```

- **Frontend:** React 19 + Vite + React Router + Axios
- **Backend:** Node.js + Express 5 + pg, kiến trúc routes → controllers → services
- **Database:** PostgreSQL 16, migration tuần tự `database/migrations/`
- **Contract-first:** mọi endpoint mô tả tại `api/openapi.yaml` (OpenAPI 3.1)
- **CI:** GitHub Actions — lint, build, unit test, migration smoke test

## Vai trò người dùng (6)

Customer, Receptionist, Service Manager, Mechanic, Inventory Staff (warehouse_staff), Admin.
Chi tiết quyền từng role: xem `docs/requirements.md`.

## Tài liệu liên quan

- `docs/requirements.md` — 20 User Stories + FR/NFR
- `docs/backlog.md` — Product backlog + story points
- `docs/sprint-plan.md` — Lộ trình 8 Sprint
- `docs/definition-of-done.md` — Tiêu chí hoàn thành
- `docs/diagrams/` — Use Case, Class, Sequence, Activity, State Machine
- `api/openapi.yaml` — Hợp đồng API
