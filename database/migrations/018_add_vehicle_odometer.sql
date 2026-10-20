ALTER TABLE vehicles
ADD COLUMN IF NOT EXISTS odometer_km INTEGER
CHECK (odometer_km IS NULL OR odometer_km >= 0);