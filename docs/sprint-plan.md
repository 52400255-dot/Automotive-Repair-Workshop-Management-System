# Sprint Plan — 8 Sprint / 8 tuần

| Sprint | Tuần | Mục tiêu | Stories | Definition of Done riêng |
|---|---|---|---|---|
| 1 | 1 | Nền tảng: requirements, board, kiến trúc, auth | US16, US17 + OpenAPI | Đăng nhập nhận JWT; board có 20 issue; `api/openapi.yaml` reviewed |
| 2 | 2 | Khách hàng & xe | US01, US02, US03 | CRUD customer/vehicle qua API + UI lễ tân; lịch sử xe hiển thị |
| 3 | 3 | Tiếp nhận & phiếu sửa | US04, US05, US06 | Lễ tân tạo được phiếu từ UI; thợ ghi được chẩn đoán |
| 4 | 4 | Phân công & tiến độ | US07, US08, US09 | Task board thợ máy chạy; đổi status đúng luồng state machine |
| 5 | 5 | Kho phụ tùng | US10, US11, US12 | Trừ kho trong transaction; cảnh báo low stock; test 409 khi thiếu hàng |
| 6 | 6 | Báo giá & hóa đơn | US13, US14, US15 | Estimate tự tính tổng; invoice cộng VAT; luồng duyệt/từ chối đúng |
| 7 | 7 | Kiểm thử tổng lực | US18, US19 | Unit coverage ≥ 60%; E2E Playwright pass toàn luồng |
| 8 | 8 | Triển khai & hoàn thiện | US20 | Docker compose up chạy full-stack; URL demo công khai; bug fix |

## Nghi lễ Scrum

- **Daily:** 15 phút, cập nhật trên issue board (comment ngắn).
- **Sprint review:** demo nhanh cuối mỗi tuần cho giảng viên/nhóm.
- **Retrospective:** ghi lại 3 được / 3 cần cải vào file sprint-notes.

## Quy tắc Git

- Branch: `feature/USxx-<ten-ngan>` từ `main`.
- Mọi merge qua Pull Request + ít nhất 1 review approve.
- PR link tới Issue bằng `Closes #<n>`.
- CI phải xanh trước khi merge.
