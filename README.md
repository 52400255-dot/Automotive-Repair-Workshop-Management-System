# Automotive Repair Workshop Management System

Đồ án môn **Công nghệ phần mềm (504011)** — ĐH Tôn Đức Thắng, Topic 12.
Hệ thống web quản lý quy trình sửa chữa ô tô: tiếp nhận xe → chẩn đoán → báo giá →
sửa chữa (trừ kho phụ tùng) → hóa đơn → thanh toán.

## Thành viên

| Thành viên | MSSV | Vai trò |
|---|---|---|
| Duong Dinh Duc | 52400109 | Trưởng nhóm — Frontend Lead (M1) |
| Luu Nhat Quang | 52400229 | Backend API & Services Lead (M2) |
| Phung Nguyen Hoang Khoi | 52400206 | Database & Security Lead (M3) |
| Tang Duy Viet | 52400255 | QA & Testing Lead (M4) |

## Công nghệ

- **Frontend:** React 19 + Vite + React Router + Axios
- **Backend:** Node.js + Express 5 (kiến trúc routes → controllers → services)
- **Database:** PostgreSQL 16 (parameterized query, transaction, FK/CHECK)
- **Auth:** JWT + RBAC 6 vai trò, bcrypt password hash
- **API Contract:** OpenAPI 3.1 — `api/openapi.yaml`
- **Testing:** Node.js built-in test runner (unit), Playwright (E2E — sprint 7)
- **CI/CD:** GitHub Actions — lint, build, test, migration smoke test
- **Container:** Docker Compose (db + backend + frontend)

## Cấu trúc thư mục

```
.
├── api/                # OpenAPI 3.1 spec (contract-first)
├── backend/            # REST API
│   └── src/
│       ├── routes/         # Endpoint + phân quyền
│       ├── controllers/    # Nhận request → gọi service
│       ├── services/       # Business logic + SQL
│       ├── middleware/     # JWT auth, RBAC, validate, error handler
│       └── utils/          # Hàm tính tiền thuần (dễ unit test)
├── frontend/           # React SPA
│   └── src/
│       ├── pages/          # Theo vai trò: reception/mechanic/inventory/customer
│       ├── components/     # layout + common
│       ├── context/        # AuthContext
│       ├── services/       # Axios client
│       └── routes/         # React Router + ProtectedRoute
├── database/
│   ├── migrations/         # 001→012, chạy tuần tự
│   ├── seeds/              # Dữ liệu demo
│   └── queries/            # Câu truy vấn kiểm tra
├── tests/
│   ├── unit/               # pricing: estimate, VAT, trừ kho
│   ├── integration/        # API workflow (sprint 7)
│   └── e2e/                # Playwright (sprint 7)
└── docs/                   # SRS, backlog, sprint plan, diagrams, ERD
```

## Chạy dự án

Yêu cầu: Docker Desktop + Node.js 20+

```bash
# 1. Database (tự chạy migration 001→012 khi tạo DB mới)
docker compose up -d db

# 2. Backend
cd backend && cp .env.example .env && npm install && npm run dev
# → API tại http://localhost:3000/api/health

# 3. Frontend (terminal khác)
cd frontend && npm install && npm run dev
# → UI tại http://localhost:5173 (proxy /api → :3000)

# Nạp dữ liệu demo
docker compose exec db psql -U workshop_user -d workshop_db \
  -f /docker-entrypoint-initdb.d/../tmp/seed.sql   # hoặc:
Get-Content .\database\seeds\002_full_demo_data.sql -Raw | docker compose exec -T db \
  psql -U workshop_user -d workshop_db

# Chạy full-stack bằng Docker (production build)
docker compose up --build
# → UI http://localhost:8080, API http://localhost:3000
```

## Kiểm thử

```bash
npm test          # Unit test: estimate, VAT, inventory deduction (24 cases)
```

CI chạy tự động trên mỗi PR: frontend lint+build, backend unit test,
migration + health check với PostgreSQL service.

## Tài liệu

- `docs/01-overview.md` — Tổng quan đề tài
- `docs/requirements.md` — 20 User Stories, Gherkin AC, ma trận RBAC
- `docs/backlog.md` — Story points, gán sprint
- `docs/sprint-plan.md` — Lộ trình 8 tuần
- `docs/definition-of-done.md` — Tiêu chí hoàn thành
- `docs/erd.md` — Sơ đồ thực thể quan hệ (14 bảng)
- `docs/diagrams/` — Use Case, Class, Sequence, Activity, State Machine
- `api/openapi.yaml` — Hợp đồng API đầy đủ

## Quy trình Git

Issue → `feature/USxx-...` branch → Code → Commit → Push → Pull Request →
Peer review → Merge `main` → CI xanh.
