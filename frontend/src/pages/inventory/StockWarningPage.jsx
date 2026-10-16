const lowStockParts = [
    { id: 'PT02', name: 'Má phanh Toyota', stock: 3, threshold: 5 },
    { id: 'PT05', name: 'Lọc gió động cơ', stock: 1, threshold: 5 }
]

export default function StockWarningPage() {
    return (
        <div style={{ padding: '20px'}}>
            <h2>[US12] Cảnh báo Phụ tùng Tồn kho thấp</h2>
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                {lowStockParts.map(item => (
                    <div key={item.id} style={{ border: '2px solid #f4f4f4', backgroundColor: '#fff2f0', padding: '15px', borderRadius: '8px', minWidth: '220px'}}>
                        <span style={{ backgroundColor: 'ff4d4f', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '12px'}}>CẢNH BÁO</span>
                        <h4 style={{ margin:'10px 0 5px' }}>{item.name}</h4>
                        <p style={{ margin: 0}}>Tồn kho hiện tại: <strong style={{ color: '#cf1322'}}>{item.stock}</strong> (Ngưỡng: {item.threshold})</p>
                    
                    </div>
                ))}
            </div>
        </div>
    );
}