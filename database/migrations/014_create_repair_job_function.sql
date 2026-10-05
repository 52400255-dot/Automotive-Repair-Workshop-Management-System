CREATE OR REPLACE FUNCTION create_repair_job_with_services(
    p_vehicle_id BIGINT,
    p_receptionist_id BIGINT,
    p_customer_request TEXT,
    p_service_items JSONB DEFAULT '[]'::jsonb
)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    v_job_id BIGINT;
    v_item JSONB;
    v_service_id BIGINT;
    v_quantity NUMERIC(12,2);
    v_price NUMERIC(14,2);
BEGIN
    IF p_service_items IS NULL
       OR jsonb_typeof(p_service_items) <> 'array' THEN
        RAISE EXCEPTION 'service_items must be a JSON array';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM users
        WHERE id = p_receptionist_id AND role = 'receptionist'
    ) THEN
        RAISE EXCEPTION 'receptionist_id is invalid';
    END IF;

    INSERT INTO repair_jobs (vehicle_id, receptionist_id, customer_request)
    VALUES (p_vehicle_id, p_receptionist_id, p_customer_request)
    RETURNING id INTO v_job_id;

    FOR v_item IN
        SELECT value FROM jsonb_array_elements(p_service_items) AS x(value)
    LOOP
        v_service_id := (v_item ->> 'service_id')::BIGINT;
        v_quantity := (v_item ->> 'quantity')::NUMERIC(12,2);

        IF v_service_id IS NULL
           OR v_quantity IS NULL
           OR v_quantity <= 0 THEN
            RAISE EXCEPTION 'invalid service_id or quantity';
        END IF;

        SELECT standard_price INTO v_price
        FROM services
        WHERE id = v_service_id
        FOR SHARE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'service_id % does not exist', v_service_id;
        END IF;

        INSERT INTO repair_details (
            repair_job_id, service_id, quantity, unit_price_at_time
        )
        VALUES (v_job_id, v_service_id, v_quantity, v_price);
    END LOOP;

    RETURN v_job_id;
END;
$$;