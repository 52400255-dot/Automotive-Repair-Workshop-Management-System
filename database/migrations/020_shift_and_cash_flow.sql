CREATE TABLE shifts (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    shift_name VARCHAR(20) NOT NULL CHECK (shift_name IN ('ca_1', 'ca_2')),
    work_date DATE NOT NULL,
    start_time TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMPTZ,
    opened_by BIGINT NOT NULL REFERENCES users(id),
    closed_by BIGINT REFERENCES users(id),
    opening_cash NUMERIC(14, 2) NOT NULL CHECK (opening_cash >= 0),
    expected_closing_cash NUMERIC(14, 2),
    actual_closing_cash NUMERIC(14, 2),
    cash_difference NUMERIC(14, 2),
    handover_cash NUMERIC(14, 2),
    deposited_cash NUMERIC(14, 2),
    total_cash_inflow NUMERIC(14, 2) NOT NULL DEFAULT 0,
    total_bank_inflow NUMERIC(14, 2) NOT NULL DEFAULT 0,
    total_cash_outflow NUMERIC(14, 2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    cash_breakdown JSONB,
    difference_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (status <> 'closed' OR (end_time IS NOT NULL AND actual_closing_cash IS NOT NULL AND handover_cash + deposited_cash = actual_closing_cash)),
    UNIQUE (shift_name, work_date)
);

CREATE UNIQUE INDEX idx_single_open_shift ON shifts (status) WHERE status = 'open';
CREATE INDEX idx_shifts_history ON shifts (work_date DESC, id DESC);

CREATE TABLE cash_transactions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    shift_id BIGINT NOT NULL REFERENCES shifts(id) ON DELETE RESTRICT,
    transaction_type VARCHAR(10) NOT NULL CHECK (transaction_type IN ('inflow', 'outflow')),
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'repair_payment', 'repair_deposit', 'spare_part_purchase', 'inventory_import', 'operational_expense', 'other'
    )),
    payment_method VARCHAR(20) NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank_transfer', 'pos_card')),
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    reference_type VARCHAR(50),
    reference_id BIGINT,
    description TEXT NOT NULL,
    approval_status VARCHAR(20) NOT NULL DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    approved_by BIGINT REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    created_by BIGINT NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cash_transactions_shift ON cash_transactions(shift_id, created_at DESC, id DESC);
CREATE UNIQUE INDEX idx_cash_transactions_invoice_payment
    ON cash_transactions(reference_type, reference_id)
    WHERE reference_type = 'invoice' AND category = 'repair_payment';
