WITH seeded_customers AS (
    INSERT INTO customers (full_name, phone, email)
    VALUES
        ('Nguyen Van An', '0901000001', 'an@example.com'),
        ('Tran Thi Binh', '0901000002', 'binh@example.com'),
        ('Le Van Cuong', '0901000003', 'cuong@example.com')
    RETURNING id, phone
)
INSERT INTO vehicles (customer_id, license_plate, brand, model, manufacture_year)
SELECT c.id, v.license_plate, v.brand, v.model, v.manufacture_year
FROM (
    VALUES
        ('0901000001', '51A-12345', 'Toyota', 'Vios', 2020),
        ('0901000001', '51A-67890', 'Honda', 'City', 2022),
        ('0901000002', '59B-23456', 'Mazda', 'CX-5', 2021),
        ('0901000003', '60A-34567', 'Hyundai', 'Accent', 2019)
) AS v(phone, license_plate, brand, model, manufacture_year)
JOIN seeded_customers AS c ON c.phone = v.phone;