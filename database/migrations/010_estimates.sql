-- 010_estimates.sql
-- Tạo bảng báo giá (estimates) và chi tiết báo giá (estimate_details)

-- Bảng báo giá tổng
CREATE TABLE estimates (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- Phiếu sửa chữa liên quan
    repair_job_id BIGINT NOT NULL REFERENCES repair_jobs(id),

    -- Trạng thái báo giá
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN (
            'draft',
            'sent',
            'approved',
            'rejected'
        )),

    -- Tổng tiền báo giá
    total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Thời điểm khách duyệt (NULL nếu chưa duyệt)
    approved_at TIMESTAMPTZ
);

-- Bảng chi tiết từng dòng báo giá
CREATE TABLE estimate_details (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- Thuộc báo giá nào
    estimate_id BIGINT NOT NULL REFERENCES estimates(id),

    -- Loại hạng mục: nhân công / phụ tùng / khác
    item_type VARCHAR(30) NOT NULL
        CHECK (item_type IN (
            'labor',
            'part',
            'other'
        )),

    -- Mô tả hạng mục
    description VARCHAR(500) NOT NULL,

    -- Số lượng
    quantity NUMERIC(12,2) NOT NULL DEFAULT 1,

    -- Đơn giá
    unit_price NUMERIC(14,2) NOT NULL
);
