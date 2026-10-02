# Product Backlog — Story Points & Sprint Gán tạm

Ư lượng: Fibonacci (1, 2, 3, 5, 8). Người = thành viên phụ trách chính (M1 UI, M2 API, M3 DB/Auth, M4 Test).

| ID | User Story | Points | Sprint | Người chính | Linked FR |
|---|---|---|---|---|---|
| US16 | Login (JWT) | 5 | 1 | M3 | FR16 |
| US17 | Manage Roles & Permissions (RBAC) | 5 | 1 | M3 | FR17 |
| — | Kiến trúc, OpenAPI, Jira/GitHub board | 5 | 1 | M2 | — |
| US01 | Manage Customers | 3 | 2 | M1+M2 | FR01 |
| US02 | Manage Vehicles | 3 | 2 | M1+M2 | FR02 |
| US03 | View Vehicle Repair History | 3 | 2 | M3 | FR03 |
| US04 | Receive Vehicle | 5 | 3 | M1+M2 | FR04 |
| US05 | Create Repair Job | 5 | 3 | M2 | FR05 |
| US06 | Update Diagnosis & Repair Info | 3 | 3 | M2 | FR06 |
| US07 | Assign Mechanic | 3 | 4 | M2 | FR07 |
| US08 | View Assigned Repair Jobs (Task Board) | 5 | 4 | M1 | FR08 |
| US09 | Update Repair Progress | 3 | 4 | M1+M2 | FR09 |
| US10 | Manage Spare Parts | 5 | 5 | M3 | FR10 |
| US11 | Record Used Spare Parts (deduction) | 8 | 5 | M2 | FR11 |
| US12 | Monitor Low Stock | 2 | 5 | M1 | FR12 |
| US13 | Create Repair Estimate | 5 | 6 | M2 | FR13 |
| US14 | Calculate Repair Cost | 5 | 6 | M2 | FR14 |
| US15 | Generate Invoice | 5 | 6 | M2+M3 | FR15 |
| US18 | Automated Unit Testing | 5 | 7 | M4 | FR18 |
| US19 | API & E2E Testing | 8 | 7 | M4 | FR19 |
| US20 | CI/CD Pipeline & Deployment | 5 | 8 | M4 | FR20 |

**Tổng: 93 points / 8 sprint ≈ 12 points/sprint** — vừa sức nhóm 4 người.

## Ghi chú groom

- US11 (deduction engine) points cao nhất vì có transaction + row lock + kiểm tra tồn.
- Các story UI (M1) ghép đôi với story API (M2) cùng sprint.
- Sprint 7 chỉ làm test; sprint 8 dành buffer cho bug fix + demo.
