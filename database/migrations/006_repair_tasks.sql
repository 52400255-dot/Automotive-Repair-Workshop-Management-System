-- 006_repair_tasks.sql
-- Tạo bảng công việc sửa chữa chi tiết (repair_tasks)

CREATE TABLE repair_tasks (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- Thuộc phiếu sửa chữa nào
    repair_job_id BIGINT NOT NULL REFERENCES repair_jobs(id),

    -- Tên công việc
    task_name VARCHAR(255) NOT NULL,

    -- Mô tả chi tiết
    description TEXT,

    -- Trạng thái công việc
    status VARCHAR(30) NOT NULL DEFAULT 'pending'
        CHECK (status IN (
            'pending',
            'in_progress',
            'completed'
        )),

    -- Thời điểm bắt đầu (NULL nếu chưa bắt đầu)
    started_at TIMESTAMPTZ,

    -- Thời điểm hoàn thành (NULL nếu chưa xong)
    completed_at TIMESTAMPTZ
);
