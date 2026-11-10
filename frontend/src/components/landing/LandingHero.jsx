import { Link } from 'react-router-dom';

const overview = [
  { value: '04', label: 'chặng dịch vụ rõ ràng' },
  { value: '01', label: 'nơi theo dõi xuyên suốt' },
  { value: '360°', label: 'góc nhìn vận hành xưởng' },
];

export default function LandingHero() {
  return (
    <section className="landing-hero" aria-labelledby="landing-hero-title">
      <div className="landing-hero-inner">
        <div className="landing-hero-copy">
          <p className="landing-eyebrow"><span /> 01 / HỆ THỐNG VẬN HÀNH XƯỞNG</p>
          <h1 id="landing-hero-title">
            <span>Chính xác từng thao tác.</span>
            <em>Tăng tốc mọi hành trình.</em>
          </h1>
          <p className="landing-hero-description">
            Từ tiếp nhận, chẩn đoán đến bàn giao — mọi công đoạn được kết nối trong một quy trình rõ ràng,
            để đội ngũ vận hành đúng nhịp và khách hàng luôn nắm bắt tiến độ.
          </p>
          <div className="landing-hero-actions">
            <a className="landing-button landing-button-dark" href="#quy-trinh">
              Khám phá quy trình <span aria-hidden="true">↗</span>
            </a>
            <Link className="landing-button landing-button-quiet" to="/login">Đăng nhập hệ thống</Link>
          </div>
          <div className="landing-hero-note">
            <span className="landing-note-mark" aria-hidden="true">G</span>
            <p><strong>Kỷ luật trong từng chặng.</strong><br />Sẵn sàng cho mọi hành trình.</p>
          </div>
        </div>

        <div className="landing-hero-visual">
          <div className="landing-image-shade" aria-hidden="true" />
          <div className="landing-image-label">
            <span className="landing-image-label-dot" />
            <span>CHÍNH XÁC TỪ VẠCH XUẤT PHÁT</span>
          </div>
          <div className="landing-visual-card">
            <div className="landing-visual-card-top">
              <span>WORKFLOW CONTROL / 04</span>
              <span className="landing-live-dot" aria-hidden="true" />
            </div>
            <strong>Một quy trình.<br />Không lỡ nhịp.</strong>
            <div className="landing-mini-steps" aria-hidden="true">
              <span className="is-complete" /><span className="is-complete" /><span /><span />
            </div>
            <small>Tiếp nhận <i>—</i> Chẩn đoán <i>—</i> Sửa chữa <i>—</i> Bàn giao</small>
          </div>
          <span className="landing-image-index" aria-hidden="true">01 / 04</span>
        </div>
      </div>

      <div className="landing-overview" aria-label="Tổng quan giải pháp">
        <div className="landing-overview-inner">
          <p className="landing-overview-intro">Kỷ luật trên từng chặng.<br /><em>Hiệu suất trong mọi quy trình.</em></p>
          {overview.map((item) => (
            <div className="landing-overview-item" key={item.value}>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
