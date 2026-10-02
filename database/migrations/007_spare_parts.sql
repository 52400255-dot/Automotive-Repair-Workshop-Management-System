-- 007_spare_parts.sql
-- Tạo bảng phụ tùng / vật tư (spare_parts)

CREATE TABLE spare_parts (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- Mã phụ tùng (duy nhất)
    part_code VARCHAR(50) NOT NULL UNIQUE,

    -- Tên phụ tùng
    part_name VARCHAR(255) NOT NULL,

    -- Đơn vị tính (cái, lít, bộ, …)
    unit VARCHAR(30) NOT NULL DEFAULT 'piece',

    -- Số lượng tồn kho hiện tại
    stock_quantity NUMERIC(12,2) NOT NULL DEFAULT 0
        CHECK (stock_quantity >= 0),

    -- Đơn giá bán / sử dụng
    unit_price NUMERIC(14,2) NOT NULL
        CHECK (unit_price >= 0),

    -- Mức tồn kho tối thiểu (cảnh báo khi dưới ngưỡng)
    min_stock NUMERIC(12,2) DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
