import { useState } from 'react';

export default function EstimatePage() {
  const [laborFee, setLaborFee] = useState(200000);
  const [partsFee, setPartsFee] = useState(650000);

  const total = Number(laborFee) + Number(partsFee);

  return (
    <div style={{ padding: '20px' }}>
      <h2>[US13] Tạo Báo giá Sửa chữa</h2>
      <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px', maxWidth: '500px' }}>
        <div style={{ marginBottom: '15px' }}>
          <label>Chi phí tiền công (VNĐ): </label>
          <input 
            type="number" 
            value={laborFee} 
            onChange={(e) => setLaborFee(e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label>Chi phí phụ tùng / vật tư (VNĐ): </label>
          <input 
            type="number" 
            value={partsFee} 
            onChange={(e) => setPartsFee(e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>
        <hr />
        <h3>Tổng chi phí dự toán: <span style={{ color: '#2f54eb' }}>{total.toLocaleString()} VNĐ</span></h3>
        <button style={{ backgroundColor: '#52c41a', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Xuất Báo Giá
        </button>
      </div>
    </div>
  );
}