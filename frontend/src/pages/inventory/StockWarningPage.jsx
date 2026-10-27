const lowStockParts = [
    { id: 'PT02', name: 'Má phanh Toyota', stock: 3, threshold: 5 },
    { id: 'PT05', name: 'Lọc gió động cơ', stock: 1, threshold: 5 }
]

export default function StockWarningPage() {
    return (
        <div className="legacy-page">
            <div className="page-header">
                <div>
                    <p className="eyebrow">Kho phụ tùng</p>
                    <h1>Cảnh báo tồn thấp</h1>
                    <p>Những phụ tùng cần được kiểm tra và bổ sung.</p>
                </div>
            </div>
            <div className="warning-grid">
                {lowStockParts.map(item => (
                    <div key={item.id} className="warning-card">
                        <span className="warning-tag">Cần bổ sung</span>
                        <h3>{item.name}</h3>
                        <p>Tồn kho hiện tại: <strong>{item.stock}</strong> · Ngưỡng tối thiểu: {item.threshold}</p>
                    
                    </div>
                ))}
            </div>
        </div>
    );
}
