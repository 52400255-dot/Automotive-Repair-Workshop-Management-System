-- Danh muc dich vu sua chua.
-- repair_jobs va spare_parts da duoc tao trong cac migration truoc.

CREATE TABLE services (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    service_code VARCHAR(50) NOT NULL UNIQUE,
    service_name VARCHAR(150) NOT NULL,
    description TEXT,
    standard_price NUMERIC(14,2) NOT NULL
        CHECK (standard_price >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Dich vu duoc ghi nhan tren tung phieu sua chua.
-- Phu tung da su dung duoc luu rieng trong used_parts.

CREATE TABLE repair_details (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    repair_job_id BIGINT NOT NULL REFERENCES repair_jobs(id),
    service_id BIGINT NOT NULL REFERENCES services(id),
    quantity NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
    unit_price_at_time NUMERIC(14,2) NOT NULL
        CHECK (unit_price_at_time >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_repair_details_repair_job_id
    ON repair_details(repair_job_id);