CREATE OR REPLACE FUNCTION assign_mechanic_to_job(
    p_repair_job_id BIGINT,
    p_mechanic_id BIGINT,
    p_assigned_by BIGINT
)
RETURNS BIGINT
LANGUAGE plpgsql
AS $function$
DECLARE
    v_assignment_id       BIGINT;
    v_existing_id         BIGINT;
    v_existing_mechanic_id BIGINT;
BEGIN
    PERFORM 1
    FROM repair_jobs
    WHERE id = p_repair_job_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Repair job % does not exist',
            p_repair_job_id;
    END IF;

    SELECT id, mechanic_id
    INTO v_existing_id, v_existing_mechanic_id
    FROM mechanic_assignments
    WHERE repair_job_id = p_repair_job_id
      AND status IN ('assigned', 'in_progress')
    ORDER BY assigned_at DESC, id DESC
    LIMIT 1
    FOR UPDATE;

    IF v_existing_id IS NOT NULL
       AND v_existing_mechanic_id = p_mechanic_id THEN
        RETURN v_existing_id;
    END IF;

    IF v_existing_id IS NOT NULL THEN
        UPDATE mechanic_assignments
        SET status = 'completed'
        WHERE id = v_existing_id;
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

    RETURN v_assignment_id;
END;
$function$;