ALTER TABLE spare_parts
  ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(14, 2) NOT NULL DEFAULT 0
    CHECK (purchase_price >= 0);

ALTER TABLE inventory_movements
  ADD COLUMN IF NOT EXISTS purchase_unit_price NUMERIC(14, 2);

ALTER TABLE cash_transactions
  ALTER COLUMN shift_id DROP NOT NULL;

ALTER TABLE cash_transactions
  DROP CONSTRAINT IF EXISTS cash_transactions_category_check,
  DROP CONSTRAINT IF EXISTS cash_transactions_payment_method_check;

ALTER TABLE cash_transactions
  ADD CONSTRAINT cash_transactions_category_check
    CHECK (category IN (
      'repair_payment', 'repair_deposit', 'spare_part_purchase', 'inventory_import',
      'operational_expense', 'other', 'cash_replenishment'
    )),
  ADD CONSTRAINT cash_transactions_payment_method_check
    CHECK (payment_method IN ('cash', 'bank_transfer', 'pos_card', 'external'));

ALTER TABLE shifts
  ADD COLUMN IF NOT EXISTS cash_replenishment_total NUMERIC(14, 2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS inventory_payables (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  inventory_movement_id BIGINT NOT NULL UNIQUE REFERENCES inventory_movements(id) ON DELETE RESTRICT,
  spare_part_id BIGINT NOT NULL REFERENCES spare_parts(id) ON DELETE RESTRICT,
  source_shift_id BIGINT REFERENCES shifts(id) ON DELETE SET NULL,
  work_date DATE NOT NULL,
  quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
  unit_cost NUMERIC(14, 2) NOT NULL CHECK (unit_cost >= 0),
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  amount_paid NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0 AND amount_paid <= amount),
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'paid')),
  created_by BIGINT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK ((status = 'paid' AND amount_paid = amount) OR (status = 'open' AND amount_paid < amount))
);

CREATE INDEX IF NOT EXISTS idx_inventory_payables_open
  ON inventory_payables (work_date, created_at)
  WHERE status = 'open';

ALTER TABLE shifts DROP CONSTRAINT IF EXISTS shifts_closed_requires_cash_count;

ALTER TABLE shifts
  ADD CONSTRAINT shifts_closed_requires_cash_count
  CHECK (status <> 'closed' OR (
    end_time IS NOT NULL
    AND actual_closing_cash IS NOT NULL
    AND expected_closing_cash = opening_cash + total_cash_inflow + cash_replenishment_total - total_cash_outflow
    AND cash_difference = actual_closing_cash - expected_closing_cash
    AND deposited_cash = actual_closing_cash - opening_cash
    AND reconciled_bank_inflow IS NOT NULL
    AND bank_difference = reconciled_bank_inflow - total_bank_inflow
    AND reconciled_pos_inflow IS NOT NULL
    AND pos_difference = reconciled_pos_inflow - total_pos_inflow
    AND handover_cash = 0
    AND cash_breakdown IS NULL
  )) NOT VALID;
