/**
 * Layout — Khung trang chung: Sidebar trái + Header trên + nội dung giữa.
 */
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout() {
  const { pathname } = useLocation();
  const isCoreScreen = ['/', '/reception', '/repair-jobs', '/task-board'].includes(pathname);

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main-column">
        <Header />
        <main className={'app-main' + (isCoreScreen ? ' app-main-core' : '')}>
          <div className="page-container">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
