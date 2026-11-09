ALTER TABLE shifts
  ADD COLUMN IF NOT EXISTS total_pos_inflow NUMERIC(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cash_order_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bank_transfer_order_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pos_order_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reconciled_bank_inflow NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS bank_difference NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS reconciled_pos_inflow NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS pos_difference NUMERIC(14, 2);

UPDATE shifts s SET
  total_cash_inflow = COALESCE((SELECT SUM(ct.amount) FROM cash_transactions ct WHERE ct.shift_id=s.id AND ct.transaction_type='inflow' AND ct.payment_method='cash' AND ct.approval_status='approved'),0),
  total_bank_inflow = COALESCE((SELECT SUM(ct.amount) FROM cash_transactions ct WHERE ct.shift_id=s.id AND ct.transaction_type='inflow' AND ct.payment_method='bank_transfer' AND ct.approval_status='approved'),0),
  total_pos_inflow = COALESCE((SELECT SUM(ct.amount) FROM cash_transactions ct WHERE ct.shift_id=s.id AND ct.transaction_type='inflow' AND ct.payment_method='pos_card' AND ct.approval_status='approved'),0),
  total_cash_outflow = COALESCE((SELECT SUM(ct.amount) FROM cash_transactions ct WHERE ct.shift_id=s.id AND ct.transaction_type='outflow' AND ct.payment_method='cash' AND ct.approval_status='approved'),0),
  cash_order_count = COALESCE((SELECT COUNT(*) FROM cash_transactions ct WHERE ct.shift_id=s.id AND ct.transaction_type='inflow' AND ct.category='repair_payment' AND ct.payment_method='cash' AND ct.approval_status='approved'),0),
  bank_transfer_order_count = COALESCE((SELECT COUNT(*) FROM cash_transactions ct WHERE ct.shift_id=s.id AND ct.transaction_type='inflow' AND ct.category='repair_payment' AND ct.payment_method='bank_transfer' AND ct.approval_status='approved'),0),
  pos_order_count = COALESCE((SELECT COUNT(*) FROM cash_transactions ct WHERE ct.shift_id=s.id AND ct.transaction_type='inflow' AND ct.category='repair_payment' AND ct.payment_method='pos_card' AND ct.approval_status='approved'),0);

DO $$
DECLARE constraint_row RECORD;
BEGIN
  FOR constraint_row IN
    SELECT conname FROM pg_constraint
    WHERE conrelid='shifts'::regclass AND contype='c'
      AND pg_get_constraintdef(oid) LIKE '%handover_cash%deposited_cash%'
  LOOP
    EXECUTE format('ALTER TABLE shifts DROP CONSTRAINT %I', constraint_row.conname);
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='shifts'::regclass AND conname='shifts_closed_requires_cash_count') THEN
    ALTER TABLE shifts DROP CONSTRAINT shifts_closed_requires_cash_count;
  END IF;
END $$;

ALTER TABLE shifts
  ADD CONSTRAINT shifts_closed_requires_cash_count
  CHECK (status <> 'closed' OR (
    end_time IS NOT NULL
    AND actual_closing_cash IS NOT NULL
    AND expected_closing_cash = opening_cash + total_cash_inflow - total_cash_outflow
    AND cash_difference = actual_closing_cash - expected_closing_cash
    AND deposited_cash = total_cash_inflow - opening_cash
    AND reconciled_bank_inflow IS NOT NULL
    AND bank_difference = reconciled_bank_inflow - total_bank_inflow
    AND reconciled_pos_inflow IS NOT NULL
    AND pos_difference = reconciled_pos_inflow - total_pos_inflow
    AND handover_cash = 0
    AND cash_breakdown IS NULL
  )) NOT VALID;
