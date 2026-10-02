-- 008_used_parts.sql
-- Tạo bảng phụ tùng đã sử dụng cho sửa chữa (used_parts)

CREATE TABLE used_parts (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- Phiếu sửa chữa sử dụng phụ tùng
    repair_job_id BIGINT NOT NULL REFERENCES repair_jobs(id),

    -- Phụ tùng được sử dụng
    spare_part_id BIGINT NOT NULL REFERENCES spare_parts(id),

    -- Số lượng sử dụng (phải > 0)
    quantity NUMERIC(12,2) NOT NULL
        CHECK (quantity > 0),

    -- Đơn giá tại thời điểm sử dụng (lưu lại để tránh thay đổi giá ảnh hưởng)
    unit_price_at_time NUMERIC(14,2) NOT NULL,

    -- Thời điểm sử dụng
    used_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
