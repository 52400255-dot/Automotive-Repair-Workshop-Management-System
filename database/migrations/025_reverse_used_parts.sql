ALTER TABLE inventory_movements
  ADD COLUMN IF NOT EXISTS reference_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS reference_id BIGINT,
  ADD COLUMN IF NOT EXISTS movement_note TEXT;

ALTER TABLE inventory_movements
  DROP CONSTRAINT IF EXISTS inventory_movements_movement_type_check;

ALTER TABLE inventory_movements
  ADD CONSTRAINT inventory_movements_movement_type_check
  CHECK (movement_type IN ('import', 'export', 'adjustment', 'reversal'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_movements_used_part_reversal
  ON inventory_movements (reference_type, reference_id)
  WHERE reference_type = 'used_part_reversal';
