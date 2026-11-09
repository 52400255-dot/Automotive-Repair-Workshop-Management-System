import { Link } from 'react-router-dom';

const features = [
  {
    number: '01',
    title: 'Hồ sơ sửa chữa xuyên suốt',
    copy: 'Thông tin xe, yêu cầu dịch vụ, chẩn đoán và báo giá được sắp xếp trong cùng một hồ sơ dễ theo dõi.',
    mark: '01',
  },
  {
    number: '02',
    title: 'Đội ngũ cùng một nhịp',
    copy: 'Lễ tân, kỹ thuật viên, quản lý và kho phụ tùng nắm đúng phần việc của mình trong quy trình.',
    mark: '02',
  },
  {
    number: '03',
    title: 'Khách hàng luôn nắm rõ',
    copy: 'Cập nhật tình trạng sửa chữa và xem lại báo giá qua cổng thông tin dành riêng cho khách hàng.',
    mark: '03',
  },
];

const steps = [
  { number: '01', title: 'Tiếp nhận', copy: 'Ghi nhận thông tin xe và điều khách hàng mong muốn.' },
  { number: '02', title: 'Chẩn đoán', copy: 'Kiểm tra kỹ lưỡng, trao đổi hạng mục và báo giá rõ ràng.' },
  { number: '03', title: 'Sửa chữa', copy: 'Thực hiện công việc, theo dõi phụ tùng và tiến độ.' },
  { number: '04', title: 'Bàn giao', copy: 'Hoàn tất phiếu, thanh toán và trao xe trở lại.' },
];

export function FeatureSection() {
  return (
    <section className="landing-features" id="he-thong" aria-labelledby="landing-features-title">
      <div className="landing-section-inner">
        <div className="landing-section-heading">
          <div>
            <p className="landing-eyebrow"><span /> MỘT XƯỞNG VẬN HÀNH TỐT BẮT ĐẦU TỪ SỰ RÕ RÀNG</p>
            <h2 id="landing-features-title">Chỉn chu từ bên trong,<br /><em>trọn vẹn với khách hàng.</em></h2>
          </div>
          <p className="landing-section-intro">
            Một không gian làm việc chung cho mọi khâu dịch vụ — để người thợ tập trung vào tay nghề,
            còn khách hàng luôn biết chiếc xe của mình đang ở đâu.
          </p>
        </div>

        <div className="landing-feature-grid">
          {features.map((feature) => (
            <article className="landing-feature-card" key={feature.number}>
              <div className="landing-feature-top">
                <span>{feature.number} <i>/</i> 03</span>
                <span className="landing-feature-mark" aria-hidden="true">{feature.mark}</span>
              </div>
              <div className="landing-feature-rule" />
              <h3>{feature.title}</h3>
              <p>{feature.copy}</p>
              <span className="landing-feature-arrow" aria-hidden="true">↗</span>
            </article>
          ))}
        </div>

        <div className="landing-feature-signoff">
          <span className="landing-signoff-line" />
          <p>VỮNG TAY NGHỀ <i>·</i> RÕ TỪNG VIỆC <i>·</i> AN TÂM TRAO XE</p>
          <span className="landing-signoff-line" />
        </div>
      </div>
    </section>
  );
}

export function WorkflowSection() {
  return (
    <section className="landing-workflow" id="quy-trinh" aria-labelledby="landing-workflow-title">
      <div className="landing-workflow-inner">
        <div className="landing-workflow-heading">
          <p className="landing-eyebrow landing-eyebrow-light"><span /> MỘT HÀNH TRÌNH, BỐN CHẶNG RÕ RÀNG</p>
          <h2 id="landing-workflow-title">Mỗi bước đều có<br /><em>lý do để an tâm.</em></h2>
          <p>Quy trình nhất quán để xưởng làm việc nhịp nhàng — và khách hàng không phải đoán xem điều gì sẽ đến tiếp theo.</p>
          <Link className="landing-text-link" to="/login">Theo dõi xe của bạn <span aria-hidden="true">↗</span></Link>
        </div>

        <ol className="landing-step-list">
          {steps.map((step) => (
            <li key={step.number}>
              <span className="landing-step-number">{step.number}</span>
              <div className="landing-step-copy">
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
              </div>
              <span className="landing-step-arrow" aria-hidden="true">↗</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function LandingCta() {
  return (
    <section className="landing-cta" id="khach-hang" aria-labelledby="landing-cta-title">
      <div className="landing-cta-inner">
        <div className="landing-cta-mark" aria-hidden="true">G</div>
        <p className="landing-eyebrow"><span /> GARAGE WORKSHOP</p>
        <h2 id="landing-cta-title">Một trải nghiệm sửa xe<br /><em>đáng để an tâm.</em></h2>
        <p>Đăng nhập để tiếp tục hành trình dịch vụ của bạn.</p>
        <Link className="landing-button landing-button-dark" to="/login">
          Vào Garage Workshop <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="landing-footer">
      <div className="landing-footer-inner">
        <Link className="landing-brand landing-footer-brand" to="/" aria-label="Garage Workshop — Trang chủ">
          <span className="landing-brand-mark" aria-hidden="true">G</span>
          <span className="landing-brand-copy">
            <strong>Garage Workshop</strong>
            <small>CHĂM XE CHUẨN MỰC</small>
          </span>
        </Link>
        <p>Chăm chút từng chiếc xe. Chỉn chu từng quy trình.</p>
        <span className="landing-copyright">© {new Date().getFullYear()} Garage Workshop</span>
      </div>
    </footer>
  );
}
