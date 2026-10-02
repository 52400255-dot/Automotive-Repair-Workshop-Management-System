# Definition of Done (DoD)

Một User Story chỉ được coi là **HOÀN THÀNH** khi thỏa toàn bộ tiêu chí sau:

## Bắt buộc với mọi story

- [ ] Code đã merge vào `main` qua Pull Request có **ít nhất 1 review approve**
- [ ] Issue GitHub tương ứng đã đóng, ghi rõ commit/PR liên quan
- [ ] Không còn `console.log` debug / code comment bị bỏ quên
- [ ] lint pass (`npm run lint` phía frontend, không warning mới)
- [ ] CI pipeline xanh (build + test)

## Theo loại công việc

### Backend API (M2)
- [ ] Endpoint khớp 100% hợp đồng `api/openapi.yaml` (path, payload, status code)
- [ ] Có kiểm tra phân quyền (RBAC) đúng ma trận trong `docs/requirements.md`
- [ ] Query dùng parameterized (`$1, $2`) — không concat SQL
- [ ] Error trả về dạng JSON `{ success: false, message }`, không leak stack trace

### Database (M3)
- [ ] Migration chạy sạch trên database trống, theo đúng thứ tự số
- [ ] Có FK + CHECK constraint; không để dữ liệu mồ côi
- [ ] Có seed tối thiểu để demo tính năng

### Frontend (M1)
- [ ] Hiển thị tốt trên desktop 1280px+
- [ ] Gọi API thật qua `src/services/api.js` (không hardcode dữ liệu)
- [ ] Xử lý trạng thái loading / error / empty list
- [ ] Route chặn theo role (ProtectedRoute)

### Testing (M4)
- [ ] Unit test cho hàm business logic mới (coverage ≥ 60%)
- [ ] Test case phủ cả happy path + edge case + error case
- [ ] Test chạy độc lập, không phụ thuộc thứ tự

## DoD cấp sprint

- [ ] Demo được luồng end-to-end của các story trong sprint
- [ ] Sprint review đã diễn ra, retrospective ghi chú xong
