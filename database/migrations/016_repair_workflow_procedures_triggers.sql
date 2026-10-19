-- 015_repair_workflow_procedures_triggers.sql
-- US04, US06, US07, US08
-- Bổ sung procedure/function, index và trigger cho quy trình sửa chữa.

BEGIN;

-- =========================================================
-- 1. INDEX VÀ RÀNG BUỘC
-- =========================================================

-- Tăng tốc truy vấn các phân công của một phiếu sửa chữa.
CREATE INDEX IF NOT EXISTS idx_mechanic_assignments_repair_job_id
    ON mechanic_assignments(repair_job_id);

-- Tăng tốc truy vấn danh sách công việc của một thợ máy.
CREATE INDEX IF NOT EXISTS idx_mechanic_assignments_mechanic_id
    ON mechanic_assignments(mechanic_id);

-- Một phiếu chỉ có tối đa một phân công đang hoạt động.
-- Phân công đã completed vẫn được lưu để theo dõi lịch sử.
CREATE UNIQUE INDEX IF NOT EXISTS uq_mechanic_assignments_active_job
    ON mechanic_assignments(repair_job_id)
    WHERE status IN ('assigned', 'in_progress');

-- Mỗi thợ chỉ có một bản ghi chẩn đoán trên một phiếu.
-- Khi chẩn đoán lại, hệ thống sẽ cập nhật bản ghi cũ.
CREATE UNIQUE INDEX IF NOT EXISTS uq_diagnoses_job_mechanic
    ON diagnoses(repair_job_id, mechanic_id);

-- Không lưu trùng một dịch vụ nhiều dòng trong cùng phiếu.
CREATE UNIQUE INDEX IF NOT EXISTS uq_repair_details_job_service
    ON repair_details(repair_job_id, service_id);


-- =========================================================
-- 2. TRIGGER KIỂM TRA PHÂN CÔNG THỢ
-- =========================================================

CREATE OR REPLACE FUNCTION validate_mechanic_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_job_status      VARCHAR(30);
    v_mechanic_role   VARCHAR(30);
    v_assigner_role   VARCHAR(30);
BEGIN
    -- Khóa phiếu trong lúc kiểm tra để tránh phân công đồng thời.
    SELECT status
    INTO v_job_status
    FROM repair_jobs
    WHERE id = NEW.repair_job_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Repair job % does not exist',
            NEW.repair_job_id;
    END IF;

    -- Không cho phân công phiếu đã kết thúc hoặc bị hủy.
    IF v_job_status IN ('completed', 'cancelled') THEN
        RAISE EXCEPTION
            'Cannot assign mechanic to repair job % with status %',
            NEW.repair_job_id,
            v_job_status;
    END IF;

    -- Người được phân công phải có vai trò mechanic.
    SELECT role
    INTO v_mechanic_role
    FROM users
    WHERE id = NEW.mechanic_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Mechanic user % does not exist',
            NEW.mechanic_id;
    END IF;

    IF v_mechanic_role <> 'mechanic' THEN
        RAISE EXCEPTION
            'User % does not have mechanic role',
            NEW.mechanic_id;
    END IF;

    -- Người phân công phải là lễ tân, quản lý dịch vụ hoặc admin.
    SELECT role
    INTO v_assigner_role
    FROM users
    WHERE id = NEW.assigned_by;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Assigning user % does not exist',
            NEW.assigned_by;
    END IF;

    IF v_assigner_role NOT IN (
        'receptionist',
        'service_manager',
        'admin'
    ) THEN
        RAISE EXCEPTION
            'User % is not allowed to assign mechanics',
            NEW.assigned_by;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_mechanic_assignment
    ON mechanic_assignments;

CREATE TRIGGER trg_validate_mechanic_assignment
BEFORE INSERT OR UPDATE OF repair_job_id, mechanic_id, assigned_by
ON mechanic_assignments
FOR EACH ROW
EXECUTE FUNCTION validate_mechanic_assignment();


-- =========================================================
-- 3. TRIGGER CHUYỂN PHIẾU SANG DIAGNOSING
-- =========================================================

CREATE OR REPLACE FUNCTION set_job_status_after_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Khi phiếu pending được phân công, chuyển sang diagnosing.
    UPDATE repair_jobs
    SET status = 'diagnosing'
    WHERE id = NEW.repair_job_id
      AND status = 'pending';

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_job_status_after_assignment
    ON mechanic_assignments;

CREATE TRIGGER trg_set_job_status_after_assignment
AFTER INSERT
ON mechanic_assignments
FOR EACH ROW
EXECUTE FUNCTION set_job_status_after_assignment();


-- =========================================================
-- 4. FUNCTION THÊM DỊCH VỤ VÀO PHIẾU SỬA CHỮA
--    Hỗ trợ repair_details
-- =========================================================

CREATE OR REPLACE FUNCTION add_repair_detail(
    p_repair_job_id BIGINT,
    p_service_id BIGINT,
    p_quantity NUMERIC(12,2),
    p_notes TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    v_job_status VARCHAR(30);
    v_price      NUMERIC(14,2);
    v_detail_id  BIGINT;
BEGIN
    IF p_quantity IS NULL OR p_quantity <= 0 THEN
        RAISE EXCEPTION 'Quantity must be greater than 0';
    END IF;

    SELECT status
    INTO v_job_status
    FROM repair_jobs
    WHERE id = p_repair_job_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Repair job % does not exist',
            p_repair_job_id;
    END IF;

    IF v_job_status IN ('completed', 'cancelled') THEN
        RAISE EXCEPTION
            'Cannot add service to repair job % with status %',
            p_repair_job_id,
            v_job_status;
    END IF;

    SELECT standard_price
    INTO v_price
    FROM services
    WHERE id = p_service_id
    FOR SHARE;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Service % does not exist',
            p_service_id;
    END IF;

    INSERT INTO repair_details (
        repair_job_id,
        service_id,
        quantity,
        unit_price_at_time,
        notes
    )
    VALUES (
        p_repair_job_id,
        p_service_id,
        p_quantity,
        v_price,
        p_notes
    )
    ON CONFLICT (repair_job_id, service_id)
    DO UPDATE SET
        quantity = repair_details.quantity + EXCLUDED.quantity,
        notes = COALESCE(EXCLUDED.notes, repair_details.notes)
    RETURNING id INTO v_detail_id;

    RETURN v_detail_id;
END;
$$;


-- =========================================================
-- 5. FUNCTION PHÂN CÔNG THỢ - US07
-- =========================================================

CREATE OR REPLACE FUNCTION assign_mechanic_to_job(
    p_repair_job_id BIGINT,
    p_mechanic_id BIGINT,
    p_assigned_by BIGINT
)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    v_assignment_id BIGINT;
    v_existing_id   BIGINT;
BEGIN
    -- Khóa phiếu để tránh hai người phân công đồng thời.
    PERFORM 1
    FROM repair_jobs
    WHERE id = p_repair_job_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Repair job % does not exist',
            p_repair_job_id;
    END IF;

    SELECT id
    INTO v_existing_id
    FROM mechanic_assignments
    WHERE repair_job_id = p_repair_job_id
      AND status IN ('assigned', 'in_progress')
    LIMIT 1
    FOR UPDATE;

    IF v_existing_id IS NOT NULL THEN
        RAISE EXCEPTION
            'Repair job % already has an active mechanic assignment',
            p_repair_job_id;
    END IF;

    INSERT INTO mechanic_assignments (
        repair_job_id,
        mechanic_id,
        assigned_by,
        status
    )
    VALUES (
        p_repair_job_id,
        p_mechanic_id,
        p_assigned_by,
        'assigned'
    )
    RETURNING id INTO v_assignment_id;

    -- Trigger sẽ tự chuyển repair_jobs.status sang diagnosing.
    RETURN v_assignment_id;
END;
$$;


-- =========================================================
-- 6. FUNCTION LƯU CHẨN ĐOÁN - US06
-- =========================================================

CREATE OR REPLACE FUNCTION save_repair_diagnosis(
    p_repair_job_id BIGINT,
    p_mechanic_id BIGINT,
    p_diagnosis_result TEXT,
    p_repair_suggestion TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    v_assignment_id BIGINT;
    v_diagnosis_id  BIGINT;
BEGIN
    IF NULLIF(BTRIM(p_diagnosis_result), '') IS NULL THEN
        RAISE EXCEPTION 'Diagnosis result must not be empty';
    END IF;

    -- Chỉ thợ đang được phân công mới được chẩn đoán.
    SELECT ma.id
    INTO v_assignment_id
    FROM mechanic_assignments AS ma
    JOIN repair_jobs AS r
        ON r.id = ma.repair_job_id
    WHERE ma.repair_job_id = p_repair_job_id
      AND ma.mechanic_id = p_mechanic_id
      AND ma.status IN ('assigned', 'in_progress')
      AND r.status = 'diagnosing'
    FOR UPDATE OF ma, r;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Mechanic % is not actively assigned to repair job %',
            p_mechanic_id,
            p_repair_job_id;
    END IF;

    INSERT INTO diagnoses (
        repair_job_id,
        mechanic_id,
        diagnosis_result,
        repair_suggestion,
        diagnosed_at
    )
    VALUES (
        p_repair_job_id,
        p_mechanic_id,
        BTRIM(p_diagnosis_result),
        NULLIF(BTRIM(p_repair_suggestion), ''),
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (repair_job_id, mechanic_id)
    DO UPDATE SET
        diagnosis_result = EXCLUDED.diagnosis_result,
        repair_suggestion = EXCLUDED.repair_suggestion,
        diagnosed_at = CURRENT_TIMESTAMP
    RETURNING id INTO v_diagnosis_id;

    -- Thợ bắt đầu thực hiện công việc sau khi ghi chẩn đoán.
    UPDATE mechanic_assignments
    SET status = 'in_progress'
    WHERE id = v_assignment_id
      AND status = 'assigned';

    RETURN v_diagnosis_id;
END;
$$;


-- =========================================================
-- 7. FUNCTION XEM CÔNG VIỆC CỦA THỢ - US08
-- =========================================================

CREATE OR REPLACE FUNCTION get_mechanic_assigned_jobs(
    p_mechanic_id BIGINT
)
RETURNS TABLE (
    assignment_id BIGINT,
    repair_job_id BIGINT,
    vehicle_id BIGINT,
    license_plate TEXT,
    customer_request TEXT,
    job_status VARCHAR(30),
    assignment_status VARCHAR(30),
    assigned_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM users
        WHERE id = p_mechanic_id
          AND role = 'mechanic'
    ) THEN
        RAISE EXCEPTION
            'User % does not exist or is not a mechanic',
            p_mechanic_id;
    END IF;

    RETURN QUERY
    SELECT
        ma.id,
        r.id,
        r.vehicle_id,
        v.license_plate::TEXT,
        r.customer_request,
        r.status,
        ma.status,
        ma.assigned_at
    FROM mechanic_assignments AS ma
    JOIN repair_jobs AS r
        ON r.id = ma.repair_job_id
    JOIN vehicles AS v
        ON v.id = r.vehicle_id
    WHERE ma.mechanic_id = p_mechanic_id
      AND ma.status IN ('assigned', 'in_progress')
      AND r.status NOT IN ('completed', 'cancelled')
    ORDER BY ma.assigned_at DESC;
END;
$$;

COMMIT;