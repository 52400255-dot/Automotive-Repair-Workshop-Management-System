-- 015_seed_initial_services.sql
-- Thêm danh mục dịch vụ sửa chữa mặc định vào hệ thống

INSERT INTO services (service_code, service_name, description, standard_price)
VALUES
    ('SVC-OIL-01', 'Thay nhớt động cơ & lọc nhớt', 'Xả nhớt cũ, thay nhớt mới tiêu chuẩn và thay lọc nhớt', 250000.00),
    ('SVC-BRK-01', 'Bảo dưỡng & kiểm tra hệ thống phanh', 'Vệ sinh đĩa phanh, kiểm tra má phanh trước/sau và châm dầu phanh', 300000.00),
    ('SVC-ENG-01', 'Kiểm tra & chẩn đoán lỗi động cơ', 'Quét lỗi bằng máy chẩn đoán OBD-II, kiểm tra cảm biến', 200000.00),
    ('SVC-AIR-01', 'Thay lọc gió động cơ & điều hòa', 'Vệ sinh buồng lọc và thay lọc gió động cơ, lọc cabin điều hòa', 150000.00),
    ('SVC-WHL-01', 'Cân chỉnh góc đặt bánh xe & đảo lốp', 'Cân mâm bấm chì, đảo 4 lốp và căn chỉnh độ chụm bánh xe', 350000.00)
ON CONFLICT (service_code) DO NOTHING;
