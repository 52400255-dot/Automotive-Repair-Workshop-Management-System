-- Kiểm tra số lượng bản ghi mẫu
SELECT
    (SELECT COUNT(*) FROM customers) AS so_khach_hang,
    (SELECT COUNT(*) FROM vehicles) AS so_xe;

-- Xem xe cùng thông tin chủ sở hữu
SELECT
    c.full_name AS ten_khach_hang,
    c.phone AS so_dien_thoai,
    v.license_plate AS bien_so,
    v.brand AS hang_xe,
    v.model AS dong_xe,
    v.manufacture_year AS nam_san_xuat
FROM vehicles AS v
JOIN customers AS c ON c.id = v.customer_id
ORDER BY c.id, v.id;

-- Đếm số xe của từng khách hàng
SELECT
    c.full_name AS ten_khach_hang,
    COUNT(v.id) AS so_xe
FROM customers AS c
LEFT JOIN vehicles AS v ON v.customer_id = c.id
GROUP BY c.id, c.full_name
ORDER BY c.id;