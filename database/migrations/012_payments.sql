-- 012_payments.sql
-- Tạo bảng thanh toán (payments)

CREATE TABLE payments (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- Hoá đơn được thanh toán
    invoice_id BIGINT NOT NULL REFERENCES invoices(id),

    -- Số tiền thanh toán (phải > 0)
    amount NUMERIC(14,2) NOT NULL
        CHECK (amount > 0),

    -- Phương thức thanh toán
    payment_method VARCHAR(30) NOT NULL
        CHECK (payment_method IN (
            'cash',
            'bank_transfer',
            'card'
        )),

    -- Thời điểm thanh toán
    paid_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
