import { useState } from 'react';

export default function EstimatePage() {
  const [laborFee, setLaborFee] = useState(200000);
  const [partsFee, setPartsFee] = useState(650000);

  const total = Number(laborFee) + Number(partsFee);

  return (
    <div className="legacy-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Báo giá sửa chữa</p>
          <h1>Dự toán chi phí</h1>
          <p>Tổng hợp tiền công và phụ tùng dự kiến.</p>
        </div>
      </div>
      <div className="legacy-panel">
        <div className="form-group">
          <label htmlFor="estimate-labor">Chi phí tiền công (VNĐ)</label>
          <input
            id="estimate-labor"
            type="number" 
            value={laborFee} 
            onChange={(e) => setLaborFee(e.target.value)}
            className="form-control"
          />
        </div>
        <div className="form-group">
          <label htmlFor="estimate-parts">Chi phí phụ tùng / vật tư (VNĐ)</label>
          <input
            id="estimate-parts"
            type="number" 
            value={partsFee} 
            onChange={(e) => setPartsFee(e.target.value)}
            className="form-control"
          />
        </div>
        <div className="estimate-total">
          <span>Tổng chi phí dự toán</span>
          <strong>{total.toLocaleString()} VNĐ</strong>
        </div>
        <button className="btn btn-success" type="button">
          Xuất báo giá
        </button>
      </div>
    </div>
  );
}
