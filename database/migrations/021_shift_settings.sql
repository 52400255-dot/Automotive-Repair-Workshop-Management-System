CREATE TABLE shift_settings (
    singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
    default_opening_cash NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (default_opening_cash >= 0),
    expense_approval_limit NUMERIC(14, 2) NOT NULL DEFAULT 2000000 CHECK (expense_approval_limit > 0),
    updated_by BIGINT REFERENCES users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO shift_settings (singleton) VALUES (TRUE) ON CONFLICT (singleton) DO NOTHING;
