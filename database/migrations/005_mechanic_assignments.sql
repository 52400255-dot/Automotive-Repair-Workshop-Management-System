-- 005_mechanic_assignments.sql
-- Tạo bảng phân công kỹ thuật viên (mechanic_assignments)

CREATE TABLE mechanic_assignments (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- Phiếu sửa chữa được phân công
    repair_job_id BIGINT NOT NULL REFERENCES repair_jobs(id),

    -- Kỹ thuật viên được phân công
    mechanic_id BIGINT NOT NULL REFERENCES users(id),

    -- Người thực hiện phân công (quản lý / lễ tân)
    assigned_by BIGINT NOT NULL REFERENCES users(id),

    -- Thời điểm phân công
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Trạng thái thực hiện
    status VARCHAR(30) NOT NULL DEFAULT 'assigned'
        CHECK (status IN (
            'assigned',
            'in_progress',
            'completed'
        ))
);
