import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

function AppFrame({ isCoreScreen }) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return undefined;

    function closeOnEscape(event) {
      if (event.key === 'Escape') setMenuOpen(false);
    }

    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);

  return (
    <div className="app-shell">
      <Sidebar isOpen={menuOpen} onNavigate={() => setMenuOpen(false)} />
      {menuOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Đóng điều hướng"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <div className="app-main-column">
        <Header onMenuToggle={() => setMenuOpen((open) => !open)} menuOpen={menuOpen} />
        <main className={`app-main${isCoreScreen ? ' app-main-core' : ''}`}>
          <div className="page-container">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default function Layout() {
  const { pathname } = useLocation();
  const isCoreScreen = ['/', '/reception', '/repair-jobs', '/task-board'].includes(pathname);

  return <AppFrame key={pathname} isCoreScreen={isCoreScreen} />;
}
