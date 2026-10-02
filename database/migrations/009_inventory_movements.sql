-- 009_inventory_movements.sql
-- Tạo bảng lịch sử xuất / nhập / điều chỉnh kho (inventory_movements)

CREATE TABLE inventory_movements (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- Phụ tùng liên quan
    spare_part_id BIGINT NOT NULL REFERENCES spare_parts(id),

    -- Nhân viên kho ghi nhận
    recorded_by BIGINT NOT NULL REFERENCES users(id),

    -- Loại biến động: nhập kho / xuất kho / điều chỉnh
    movement_type VARCHAR(20) NOT NULL
        CHECK (movement_type IN (
            'import',
            'export',
            'adjustment'
        )),

    -- Số lượng (dương = nhập, âm = xuất, tuỳ nghiệp vụ)
    quantity NUMERIC(12,2) NOT NULL,

    -- Thời điểm ghi nhận
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
