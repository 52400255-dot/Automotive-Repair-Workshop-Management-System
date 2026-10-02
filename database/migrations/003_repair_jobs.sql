-- 003_repair_jobs.sql
-- Tạo bảng phiếu sửa chữa (repair_jobs)

CREATE TABLE repair_jobs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- Xe được tiếp nhận
    vehicle_id BIGINT NOT NULL REFERENCES vehicles(id),

    -- Nhân viên tiếp nhận
    receptionist_id BIGINT NOT NULL REFERENCES users(id),

    -- Yêu cầu / mô tả triệu chứng từ khách hàng
    customer_request TEXT,

    -- Trạng thái luồng sửa chữa
    status VARCHAR(30) NOT NULL DEFAULT 'pending'
        CHECK (status IN (
            'pending',
            'diagnosing',
            'estimated',
            'approved',
            'in_repair',
            'completed',
            'cancelled'
        )),

    -- Thời điểm tiếp nhận xe
    received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Thời điểm hoàn thành (NULL nếu chưa xong)
    completed_at TIMESTAMPTZ
);
