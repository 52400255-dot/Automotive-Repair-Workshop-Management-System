# Yêu cầu hệ thống (SRS rút gọn)

## 1. User Stories (US01–US20)

| ID | User Story | Epic | Priority |
|---|---|---|---|
| US01 | Manage Customers | Customer & Vehicle | High |
| US02 | Manage Vehicles | Customer & Vehicle | High |
| US03 | View Vehicle Repair History | Customer & Vehicle | Medium |
| US04 | Receive Vehicle | Vehicle Reception & Job | High |
| US05 | Create Repair Job | Vehicle Reception & Job | High |
| US06 | Update Diagnosis & Repair Information | Vehicle Reception & Job | High |
| US07 | Assign Mechanic | Mechanic & Repair Workflow | High |
| US08 | View Assigned Repair Jobs | Mechanic & Repair Workflow | High |
| US09 | Update Repair Progress | Mechanic & Repair Workflow | High |
| US10 | Manage Spare Parts | Spare Parts Inventory | High |
| US11 | Record Used Spare Parts | Spare Parts Inventory | High |
| US12 | Monitor Low Stock | Spare Parts Inventory | Medium |
| US13 | Create Repair Estimate | Estimate & Invoice | High |
| US14 | Calculate Repair Cost | Estimate & Invoice | High |
| US15 | Generate Invoice | Estimate & Invoice | High |
| US16 | Login | Auth & Authorization | High |
| US17 | Manage Roles & Permissions | Auth & Authorization | High |
| US18 | Automated Unit Testing | Testing / CI/CD | High |
| US19 | API & E2E Testing | Testing / CI/CD | Medium |
| US20 | CI/CD Pipeline & Deployment | Testing / CI/CD | Medium |

## 2. Acceptance Criteria mẫu (Gherkin)

### US04 — Receive Vehicle

```gherkin
Scenario: Tiếp nhận xe thành công
  Given lễ tân "recep_01" đã đăng nhập
  And khách hàng "Nguyen Van An" có xe biển số "51A-12345"
  When lễ tân gửi POST /api/v1/repair-jobs với { vehicleId, customerRequest }
  Then phản hồi là 201 Created
  And phiếu sửa chữa mới có trạng thái "pending"

Scenario: Không tạo được phiếu cho xe không tồn tại
  Given lễ tân đã đăng nhập
  When gửi POST /api/v1/repair-jobs với vehicleId không hợp lệ
  Then phản hồi là 400/404 và không có phiếu nào được tạo
```

### US11 — Record Used Spare Parts (Inventory Deduction)

```gherkin
Scenario: Trừ kho thành công
  Given phụ tùng "Lọc nhớt" còn 10 cái trong kho
  When thợ máy ghi nhận dùng 2 cái cho phiếu #5
  Then tồn kho còn 8
  And bản ghi used_parts được tạo với đơn giá tại thời điểm xuất
  And inventory_movements ghi nhận 1 luồng "export"

Scenario: Từ chối khi kho không đủ
  Given phụ tùng còn 1 cái
  When thợ yêu cầu dùng 2 cái
  Then phản hồi 409 "Kho không đủ số lượng yêu cầu"
  And tồn kho không thay đổi
```

### US14 — Calculate Repair Cost

```gherkin
Scenario: Hóa đơn gồm VAT 10%
  Given phiếu #5 đã hoàn thành, nhân công 500000, phụ tùng 1000000
  When lễ tân gửi POST /api/v1/invoices { repairJobId: 5 }
  Then tổng hóa đơn = (500000 + 1000000) × 1.10 = 1650000
  And chi tiết hóa đơn có dòng "Thuế VAT (10%)" = 150000
```

## 3. Yêu cầu phi chức năng (NFR)

| ID | Yêu cầu |
|---|---|
| NFR-01 | Availability ≥ 99.5% |
| NFR-02 | Bảo mật: JWT + RBAC cho 6 role; password hash bcrypt; SQL parameterized |
| NFR-03 | API response time ≤ 500ms |
| NFR-04 | Unit test coverage ≥ 60% cho business logic |
| NFR-05 | Mọi endpoint tuân thủ hợp đồng `api/openapi.yaml` |

## 4. Ma trận phân quyền (RBAC)

| Chức năng | Customer | Receptionist | Svc Manager | Mechanic | Warehouse | Admin |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| Xem lịch sử xe của mình | ✅ | — | — | — | — | — |
| Quản lý khách hàng/xe | — | ✅ | — | — | — | ✅ |
| Tiếp nhận xe, tạo phiếu | — | ✅ | — | — | — | — |
| Phân công thợ | — | ✅ | ✅ | — | — | — |
| Chẩn đoán, cập nhật tiến độ | — | — | — | ✅ | — | — |
| Ghi nhận phụ tùng (trừ kho) | — | — | — | ✅ | — | — |
| Quản lý kho, nhập hàng | — | — | — | — | ✅ | ✅ |
| Tạo báo giá | — | ✅ | — | — | — | — |
| Duyệt/từ chối báo giá | ✅ | ✅ | — | — | — | — |
| Xuất hóa đơn, ghi nhận thanh toán | — | ✅ | — | — | — | ✅ |
| Quản lý user & phân quyền | — | — | — | — | — | ✅ |
