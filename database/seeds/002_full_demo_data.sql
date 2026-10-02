-- 002_full_demo_data.sql
-- Dữ liệu mẫu đầy đủ cho toàn bộ hệ thống quản lý xưởng sửa chữa ô tô
-- Bao gồm: users, spare_parts, repair_jobs, diagnoses, mechanic_assignments,
--
-- Mat khau demo cua TAT CA tai khoan: 123456
--           estimates, estimate_details, invoices, invoice_details, payments

-- ============================================================
-- 1. Thêm người dùng hệ thống (7 tài khoản, nhiều vai trò)
-- ============================================================
INSERT INTO users (full_name, email, password_hash, role) VALUES
    -- Lễ tân
    ('Pham Thi Dung',   'dung.receptionist@workshop.vn',  '$2b$10$SiJ8GZbnmaKE0CwG7BFaJe1BH9c9/ylxb0QVeDcs3VCYbNPlDIu1m', 'receptionist'),
    ('Vo Van Duc',      'duc.receptionist@workshop.vn',   '$2b$10$SiJ8GZbnmaKE0CwG7BFaJe1BH9c9/ylxb0QVeDcs3VCYbNPlDIu1m', 'receptionist'),
    -- Kỹ thuật viên
    ('Hoang Van Hieu',  'hieu.mechanic@workshop.vn',      '$2b$10$SiJ8GZbnmaKE0CwG7BFaJe1BH9c9/ylxb0QVeDcs3VCYbNPlDIu1m', 'mechanic'),
    ('Nguyen Van Khoa', 'khoa.mechanic@workshop.vn',      '$2b$10$SiJ8GZbnmaKE0CwG7BFaJe1BH9c9/ylxb0QVeDcs3VCYbNPlDIu1m', 'mechanic'),
    -- Quản lý dịch vụ
    ('Tran Van Minh',   'minh.manager@workshop.vn',       '$2b$10$SiJ8GZbnmaKE0CwG7BFaJe1BH9c9/ylxb0QVeDcs3VCYbNPlDIu1m', 'service_manager'),
    -- Nhân viên kho
    ('Le Thi Ngoc',     'ngoc.warehouse@workshop.vn',     '$2b$10$SiJ8GZbnmaKE0CwG7BFaJe1BH9c9/ylxb0QVeDcs3VCYbNPlDIu1m', 'warehouse_staff'),
    -- Quản trị viên
    ('Admin He Thong',  'admin@workshop.vn',              '$2b$10$SiJ8GZbnmaKE0CwG7BFaJe1BH9c9/ylxb0QVeDcs3VCYbNPlDIu1m', 'admin');

-- ============================================================
-- 2. Thêm phụ tùng mẫu (5 loại)
-- ============================================================
INSERT INTO spare_parts (part_code, part_name, unit, stock_quantity, unit_price, min_stock) VALUES
    ('OIL-FILTER-001',  'Lọc dầu động cơ',       'piece', 50,  120000.00,  10),
    ('BRAKE-PAD-001',   'Má phanh trước',         'set',   30,  450000.00,   5),
    ('SPARK-PLUG-001',  'Bugi đánh lửa',          'piece', 80,   85000.00,  20),
    ('AIR-FILTER-001',  'Lọc gió',                'piece', 40,  150000.00,  10),
    ('COOLANT-001',     'Nước làm mát động cơ',   'liter', 60,   65000.00,  15);

-- ============================================================
-- 3. Phiếu sửa chữa mẫu
--    Cần customer + vehicle từ seed 001, dùng xe 51A-12345 và 59B-23456
--    Receptionist: dùng user id tra theo email
-- ============================================================

-- Phiếu 1: đã duyệt báo giá, đang sửa
-- Phiếu 2: mới tiếp nhận, đang chẩn đoán
DO $$
DECLARE
    v_receptionist_1  BIGINT;
    v_receptionist_2  BIGINT;
    v_mechanic_1      BIGINT;
    v_mechanic_2      BIGINT;
    v_manager         BIGINT;
    v_warehouse       BIGINT;
    v_vehicle_1       BIGINT;
    v_vehicle_2       BIGINT;
    v_job_1           BIGINT;
    v_job_2           BIGINT;
    v_diagnosis_1     BIGINT;
    v_estimate_1      BIGINT;
    v_invoice_1       BIGINT;
    v_spare_oil       BIGINT;
    v_spare_brake     BIGINT;
BEGIN
    -- Tra cứu user ids
    SELECT id INTO v_receptionist_1 FROM users WHERE email = 'dung.receptionist@workshop.vn';
    SELECT id INTO v_receptionist_2 FROM users WHERE email = 'duc.receptionist@workshop.vn';
    SELECT id INTO v_mechanic_1    FROM users WHERE email = 'hieu.mechanic@workshop.vn';
    SELECT id INTO v_mechanic_2    FROM users WHERE email = 'khoa.mechanic@workshop.vn';
    SELECT id INTO v_manager       FROM users WHERE email = 'minh.manager@workshop.vn';
    SELECT id INTO v_warehouse     FROM users WHERE email = 'ngoc.warehouse@workshop.vn';

    -- Tra cứu vehicle ids (từ seed 001)
    SELECT id INTO v_vehicle_1 FROM vehicles WHERE license_plate = '51A-12345';
    SELECT id INTO v_vehicle_2 FROM vehicles WHERE license_plate = '59B-23456';

    -- Tra cứu spare part ids
    SELECT id INTO v_spare_oil   FROM spare_parts WHERE part_code = 'OIL-FILTER-001';
    SELECT id INTO v_spare_brake FROM spare_parts WHERE part_code = 'BRAKE-PAD-001';

    -- -------------------------------------------------------
    -- Phiếu sửa chữa 1: xe 51A-12345, trạng thái "in_repair"
    -- -------------------------------------------------------
    INSERT INTO repair_jobs (vehicle_id, receptionist_id, customer_request, status, received_at)
    VALUES (v_vehicle_1, v_receptionist_1,
            'Xe có tiếng kêu lạ ở động cơ khi tăng tốc, đèn check engine bật sáng.',
            'in_repair',
            CURRENT_TIMESTAMP - INTERVAL '3 days')
    RETURNING id INTO v_job_1;

    -- -------------------------------------------------------
    -- Phiếu sửa chữa 2: xe 59B-23456, trạng thái "diagnosing"
    -- -------------------------------------------------------
    INSERT INTO repair_jobs (vehicle_id, receptionist_id, customer_request, status, received_at)
    VALUES (v_vehicle_2, v_receptionist_2,
            'Phanh có dấu hiệu bị rung khi đạp mạnh, cần kiểm tra hệ thống phanh.',
            'diagnosing',
            CURRENT_TIMESTAMP - INTERVAL '1 day')
    RETURNING id INTO v_job_2;

    -- -------------------------------------------------------
    -- Chẩn đoán cho phiếu 1
    -- -------------------------------------------------------
    INSERT INTO diagnoses (repair_job_id, mechanic_id, diagnosis_result, repair_suggestion, diagnosed_at)
    VALUES (v_job_1, v_mechanic_1,
            'Lọc dầu bị tắc, bugi mòn. Cảm biến oxy hoạt động bình thường.',
            'Thay lọc dầu và bugi, reset đèn check engine.',
            CURRENT_TIMESTAMP - INTERVAL '2 days 18 hours')
    RETURNING id INTO v_diagnosis_1;

    -- -------------------------------------------------------
    -- Phân công kỹ thuật viên cho phiếu 1
    -- -------------------------------------------------------
    INSERT INTO mechanic_assignments (repair_job_id, mechanic_id, assigned_by, assigned_at, status)
    VALUES (v_job_1, v_mechanic_1, v_manager,
            CURRENT_TIMESTAMP - INTERVAL '2 days 16 hours',
            'in_progress');

    -- -------------------------------------------------------
    -- Công việc sửa chữa cho phiếu 1
    -- -------------------------------------------------------
    INSERT INTO repair_tasks (repair_job_id, task_name, description, status, started_at) VALUES
        (v_job_1, 'Thay lọc dầu',   'Tháo lọc dầu cũ, lắp lọc dầu mới OIL-FILTER-001',    'in_progress', CURRENT_TIMESTAMP - INTERVAL '2 days'),
        (v_job_1, 'Thay bugi',       'Thay bộ bugi 4 chiếc, kiểm tra khe hở điện cực',       'pending',     NULL);

    -- -------------------------------------------------------
    -- Phụ tùng đã sử dụng cho phiếu 1
    -- -------------------------------------------------------
    INSERT INTO used_parts (repair_job_id, spare_part_id, quantity, unit_price_at_time, used_at) VALUES
        (v_job_1, v_spare_oil,   1, 120000.00, CURRENT_TIMESTAMP - INTERVAL '2 days'),
        (v_job_1, v_spare_brake, 1, 450000.00, CURRENT_TIMESTAMP - INTERVAL '2 days');

    -- -------------------------------------------------------
    -- Biến động kho (xuất cho phiếu 1)
    -- -------------------------------------------------------
    INSERT INTO inventory_movements (spare_part_id, recorded_by, movement_type, quantity, recorded_at) VALUES
        (v_spare_oil,   v_warehouse, 'export', -1, CURRENT_TIMESTAMP - INTERVAL '2 days'),
        (v_spare_brake, v_warehouse, 'export', -1, CURRENT_TIMESTAMP - INTERVAL '2 days');

    -- -------------------------------------------------------
    -- Báo giá cho phiếu 1 (đã duyệt)
    -- -------------------------------------------------------
    INSERT INTO estimates (repair_job_id, status, total_amount, created_at, approved_at)
    VALUES (v_job_1, 'approved', 920000.00,
            CURRENT_TIMESTAMP - INTERVAL '2 days 12 hours',
            CURRENT_TIMESTAMP - INTERVAL '2 days 6 hours')
    RETURNING id INTO v_estimate_1;

    -- Chi tiết báo giá: 1 dòng nhân công + 1 dòng phụ tùng
    INSERT INTO estimate_details (estimate_id, item_type, description, quantity, unit_price) VALUES
        (v_estimate_1, 'labor', 'Công thay lọc dầu và bugi (2 giờ)',  1, 350000.00),
        (v_estimate_1, 'part',  'Lọc dầu + Má phanh trước',           1, 570000.00);

    -- -------------------------------------------------------
    -- Hoá đơn cho phiếu 1 (đã phát hành)
    -- -------------------------------------------------------
    INSERT INTO invoices (repair_job_id, estimate_id, status, total_amount, issued_at)
    VALUES (v_job_1, v_estimate_1, 'issued', 920000.00,
            CURRENT_TIMESTAMP - INTERVAL '1 day')
    RETURNING id INTO v_invoice_1;

    -- Chi tiết hoá đơn
    INSERT INTO invoice_details (invoice_id, description, quantity, unit_price) VALUES
        (v_invoice_1, 'Công thay lọc dầu và bugi (2 giờ)',  1, 350000.00),
        (v_invoice_1, 'Lọc dầu + Má phanh trước',           1, 570000.00);

    -- -------------------------------------------------------
    -- Thanh toán cho hoá đơn trên
    -- -------------------------------------------------------
    INSERT INTO payments (invoice_id, amount, payment_method, paid_at)
    VALUES (v_invoice_1, 920000.00, 'bank_transfer', CURRENT_TIMESTAMP - INTERVAL '12 hours');

END $$;
