CREATE TABLE service_appointments (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    vehicle_id BIGINT NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
    requested_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    requested_for TIMESTAMPTZ NOT NULL,
    confirmed_for TIMESTAMPTZ,
    customer_request TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending','proposed','confirmed','declined','cancelled','converted')),
    staff_note TEXT,
    decided_by BIGINT REFERENCES users(id),
    decided_at TIMESTAMPTZ,
    repair_job_id BIGINT UNIQUE REFERENCES repair_jobs(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK ((status = 'converted') = (repair_job_id IS NOT NULL)),
    CHECK (status NOT IN ('confirmed','converted') OR confirmed_for IS NOT NULL)
);

CREATE UNIQUE INDEX idx_one_active_appointment_per_vehicle
  ON service_appointments(vehicle_id)
  WHERE status IN ('pending','proposed','confirmed');
CREATE INDEX idx_service_appointments_staff_queue
  ON service_appointments(status, requested_for, id);
CREATE INDEX idx_service_appointments_customer
  ON service_appointments(customer_id, created_at DESC, id DESC);

CREATE TABLE customer_notifications (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_key VARCHAR(80) NOT NULL,
    title VARCHAR(180) NOT NULL,
    message TEXT NOT NULL,
    entity_type VARCHAR(40),
    entity_id BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMPTZ,
    UNIQUE(user_id, event_key)
);

CREATE INDEX idx_customer_notifications_inbox
  ON customer_notifications(user_id, created_at DESC, id DESC);
