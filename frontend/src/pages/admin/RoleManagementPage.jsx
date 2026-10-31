const ROLE_OPTIONS = [
  { value: 'customer', label: 'Khách hàng' },
  { value: 'receptionist', label: 'Lễ tân' },
  { value: 'service_manager', label: 'Quản lý dịch vụ' },
  { value: 'mechanic', label: 'Thợ sửa chữa' },
  { value: 'warehouse_staff', label: 'Nhân viên kho' },
  { value: 'admin', label: 'Quản trị viên' },
];

export default function RoleManagementPage() {
  return (
    <div className="legacy-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Quản trị truy cập</p>
          <h1>Vai trò &amp; phân quyền</h1>
          <p>
            Xem danh sách người dùng và cập nhật vai trò trong hệ thống.
          </p>
        </div>
      </div>

      <section
        className="card"
        aria-labelledby="role-integration-heading"
      >
        <h2 id="role-integration-heading">Trạng thái kết nối</h2>

        <p role="status">
          Chưa kết nối API quản lý người dùng. Chức năng tải danh sách
          và cập nhật vai trò chưa được kích hoạt.
        </p>

        <p>
          Trang chưa tải dữ liệu nên chưa thể xác định số lượng
          người dùng trong hệ thống.
        </p>
      </section>

      <section aria-labelledby="user-list-heading">
        <h2 id="user-list-heading">Danh sách người dùng</h2>

        <div className="card table-wrapper">
          <table aria-labelledby="user-list-heading">
            <thead>
              <tr>
                <th scope="col">Mã người dùng</th>
                <th scope="col">Họ và tên</th>
                <th scope="col">Email</th>
                <th scope="col">Vai trò hiện tại</th>
                <th scope="col">Vai trò mới</th>
                <th scope="col">Thao tác</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td colSpan={6}>
                  Danh sách sẽ được hiển thị sau khi kết nối API thật.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section
        className="card"
        aria-labelledby="supported-roles-heading"
      >
        <h2 id="supported-roles-heading">Các vai trò trong hệ thống</h2>

        <ul>
          {ROLE_OPTIONS.map((role) => (
            <li key={role.value}>
              {role.label} — <code>{role.value}</code>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}