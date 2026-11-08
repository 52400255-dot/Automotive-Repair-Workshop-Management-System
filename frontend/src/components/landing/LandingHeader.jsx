import { useState } from 'react';
import { Link } from 'react-router-dom';

const navigation = [
  { href: '#he-thong', label: 'Giải pháp' },
  { href: '#quy-trinh', label: 'Quy trình' },
  { href: '#khach-hang', label: 'Khách hàng' },
];

export default function LandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="landing-header">
      <div className="landing-header-inner">
        <Link className="landing-brand" to="/" aria-label="Garage Workshop — Trang chủ" onClick={closeMenu}>
          <span className="landing-brand-mark" aria-hidden="true">G</span>
          <span className="landing-brand-copy">
            <strong>Garage Workshop</strong>
            <small>MOTOR SERVICE SYSTEM</small>
          </span>
        </Link>

        <button
          className={`landing-menu-toggle${menuOpen ? ' is-open' : ''}`}
          type="button"
          aria-label={menuOpen ? 'Đóng menu điều hướng' : 'Mở menu điều hướng'}
          aria-expanded={menuOpen}
          aria-controls="landing-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
        </button>

        <nav
          className={`landing-navigation${menuOpen ? ' is-open' : ''}`}
          id="landing-navigation"
          aria-label="Điều hướng chính"
        >
          {navigation.map((item) => (
            <a key={item.href} href={item.href} onClick={closeMenu}>{item.label}</a>
          ))}
          <Link className="landing-nav-login" to="/login" onClick={closeMenu}>Đăng nhập</Link>
          <Link className="landing-nav-cta" to="/login" onClick={closeMenu}>
            Vào hệ thống <span aria-hidden="true">↗</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
