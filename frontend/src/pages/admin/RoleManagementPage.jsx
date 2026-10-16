import React, { useState } from 'react';

const initialUsers = [
  { id: 1, name: 'Dương Đình Đức', email: 'duc@workshop.com', role: 'Admin' },
  { id: 2, name: 'Phùng Nguyễn Hoàng Khôi', email: 'khoi@workshop.com', role: 'Receptionist' },
  { id: 3, name: 'Lưu Nhật Quang', email: 'quang@workshop.com', role: 'Mechanic' }
];

export default function RoleManagementPage() {
  const [users, setUsers] = useState(initialUsers);

  const handleRoleChange = (userId, newRole) => {
    setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    alert(`Đã cập nhật vai trò của người dùng thành ${newRole}`);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>[US17] Quản lý Vai trò & Phân quyền (RBAC)</h2>
      <table border="1" cellPadding="10" cellSpacing="0" style={{ width: '100%', textAlign: 'left' }}>
        <thead>
          <tr style={{ backgroundColor: '#f2f2f2' }}>
            <th>ID</th>
            <th>Họ và Tên</th>
            <th>Email</th>
            <th>Vai Trò Hiện Tại</th>
            <th>Gán Vai Trò Mới</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.id}</td>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td><strong>{user.role}</strong></td>
              <td>
                <select 
                  value={user.role} 
                  onChange={(e) => handleRoleChange(user.id, e.target.value)}
                >
                  <option value="Admin">Admin</option>
                  <option value="Receptionist">Receptionist (Lễ tân)</option>
                  <option value="Mechanic">Mechanic (Thợ sửa chữa)</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}