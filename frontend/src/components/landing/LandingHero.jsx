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
          <p className="landing-eyebrow"><span /> VẬN HÀNH XƯỞNG, THEO MỘT CHUẨN MỰC MỚI</p>
          <h1 id="landing-hero-title">Chăm xe tận tâm.<br /><em>Vận hành chỉn chu.</em></h1>
          <p className="landing-hero-description">
            Mỗi chiếc xe là một lời gửi gắm. Garage Workshop giúp đội ngũ chăm sóc từng công đoạn —
            từ lúc tiếp nhận đến ngày trao chìa khóa trở lại.
          </p>
          <div className="landing-hero-actions">
            <a className="landing-button landing-button-dark" href="#quy-trinh">
              Khám phá quy trình <span aria-hidden="true">↗</span>
            </a>
            <Link className="landing-button landing-button-quiet" to="/login">Đăng nhập hệ thống</Link>
          </div>
          <div className="landing-hero-note">
            <span className="landing-note-mark" aria-hidden="true">G</span>
            <p><strong>Rõ ràng trong từng bước.</strong><br />An tâm trong từng lần bàn giao.</p>
          </div>
        </div>

        <div className="landing-hero-visual">
          <img
            className="landing-hero-image"
            src="/images/garage-hero.png"
            alt="Không gian xưởng ô tô hiện đại, nơi người thợ kiểm tra chiếc xe trước khi sửa chữa"
          />
          <div className="landing-image-shade" aria-hidden="true" />
          <div className="landing-image-label">
            <span className="landing-image-label-dot" />
            <span>CHU ĐÁO TỪ LÚC TIẾP NHẬN</span>
          </div>
          <div className="landing-visual-card">
            <div className="landing-visual-card-top">
              <span>TRẢI NGHIỆM DỊCH VỤ</span>
              <span className="landing-live-dot" aria-hidden="true" />
            </div>
            <strong>Một hành trình<br />được chăm chút.</strong>
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
          <p className="landing-overview-intro">Tỉ mỉ trong nghề.<br /><em>Rành mạch trong vận hành.</em></p>
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
