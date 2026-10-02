-- 004_diagnoses.sql
-- Tạo bảng chẩn đoán kỹ thuật (diagnoses)

CREATE TABLE diagnoses (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- Phiếu sửa chữa liên quan
    repair_job_id BIGINT NOT NULL REFERENCES repair_jobs(id),

    -- Kỹ thuật viên thực hiện chẩn đoán
    mechanic_id BIGINT NOT NULL REFERENCES users(id),

    -- Kết quả chẩn đoán
    diagnosis_result TEXT NOT NULL,

    -- Đề xuất phương án sửa chữa
    repair_suggestion TEXT,

    -- Thời điểm chẩn đoán
    diagnosed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
