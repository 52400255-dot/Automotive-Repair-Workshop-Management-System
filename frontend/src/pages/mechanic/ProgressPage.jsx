import React, { useState } from "react";

const initialJobs = [
    { id: 101, vehicle: '51H-123.45', customer: 'Nguyễn Văn A', status: 'Đang chẩn đoán' },
    { id: 102, vehicle: '29A-678.90', customer: 'Trần Thị B', status: 'Đang sửa chữa' },
];

export default function ProgressPage() {
    const [jobs, setJobs] = useState(initialJobs);
    const handleStatusChange = (id, newStatus) => {
        setJobs(jobs.map(job => job.id === id ? { ...job, status: newStatus } : job));
    };

    return  (
        <div style={{ padding: '20px' }}>
            <h2>[US09] Cập nhật Tiến độ Sửa chữa</h2>
            <table border="1" cellPadding="0" style={{width : '100%', textAlign: 'left'}}>
                <thead>
                    <tr style={{ backgroundColor: '#f2f2f2' }}> 
                        <th>Mã Phiếu</th>
                        <th>Biển Số Xe</th>
                        <th>Khách Hàng</th>
                        <th>Trạng Thái Hiện Tại</th>
                        <th>Cập Nhật Trạng Thái</th>
                    </tr>
                </thead>
                <tbody>
                    {jobs.map((job) => (
                        <tr key={job.id}>
                            <td>#{job.id}</td>
                            <td>{job.vehicle}</td>
                            <td>{job.customer}</td>
                            <td><strong>{job.status}</strong></td>
                            <td>
                                <select 
                                    value={job.status}
                                    onChange={(e) => handleStatusChange(job.id, e.target.value)}
                                >
                                    <option value="Đang chẩn đoán">Đang chẩn đoán</option>
                                    <option value="Đang sửa chữa">Đang sửa chữa</option>
                                    <option value="Chờ phụ tùng">Chờ phụ tùng</option>
                                    <option value="Hoàn thành">Hoàn thành</option>
                                </select>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}