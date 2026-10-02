-- 011_invoices.sql
-- Tạo bảng hoá đơn (invoices) và chi tiết hoá đơn (invoice_details)

-- Bảng hoá đơn tổng
CREATE TABLE invoices (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- Phiếu sửa chữa liên quan
    repair_job_id BIGINT NOT NULL REFERENCES repair_jobs(id),

    -- Báo giá gốc (có thể NULL nếu tạo hoá đơn trực tiếp)
    estimate_id BIGINT REFERENCES estimates(id),

    -- Trạng thái hoá đơn
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN (
            'draft',
            'issued',
            'paid',
            'cancelled'
        )),

    -- Tổng tiền hoá đơn
    total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,

    -- Thời điểm phát hành (NULL nếu còn nháp)
    issued_at TIMESTAMPTZ
);

-- Bảng chi tiết từng dòng hoá đơn
CREATE TABLE invoice_details (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- Thuộc hoá đơn nào
    invoice_id BIGINT NOT NULL REFERENCES invoices(id),

    -- Mô tả hạng mục
    description VARCHAR(500) NOT NULL,

    -- Số lượng
    quantity NUMERIC(12,2) NOT NULL DEFAULT 1,

    -- Đơn giá
    unit_price NUMERIC(14,2) NOT NULL
);
