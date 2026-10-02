/**
 * AppRouter — Định tuyến toàn bộ ứng dụng.
 * Mỗi role được điều hướng tới đúng trang việc của mình sau khi đăng nhập.
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from './ProtectedRoute';
import Layout from '../components/layout/Layout';

import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import ReceptionPage from '../pages/reception/ReceptionPage';
import RepairJobsPage from '../pages/reception/RepairJobsPage';
import CustomersPage from '../pages/reception/CustomersPage';
import TaskBoardPage from '../pages/mechanic/TaskBoardPage';
import InventoryPage from '../pages/inventory/InventoryPage';
import StatusPortalPage from '../pages/customer/StatusPortalPage';

/** Sau khi đăng nhập, customer vào Portal, các role khác vào Dashboard */
function Home() {
  const { user } = useAuth();
  if (user?.role === 'customer') return <Navigate to="/portal" replace />;
  return <DashboardPage />;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<Layout />}>
          <Route path="/" element={
            <ProtectedRoute roles={['receptionist', 'service_manager', 'mechanic', 'warehouse_staff', 'admin']}>
              <Home />
            </ProtectedRoute>
          } />
          <Route path="/reception" element={
            <ProtectedRoute roles={['receptionist']}><ReceptionPage /></ProtectedRoute>
          } />
          <Route path="/repair-jobs" element={
            <ProtectedRoute roles={['receptionist', 'service_manager', 'admin']}><RepairJobsPage /></ProtectedRoute>
          } />
          <Route path="/customers" element={
            <ProtectedRoute roles={['receptionist', 'admin']}><CustomersPage /></ProtectedRoute>
          } />
          <Route path="/task-board" element={
            <ProtectedRoute roles={['mechanic']}><TaskBoardPage /></ProtectedRoute>
          } />
          <Route path="/inventory" element={
            <ProtectedRoute roles={['warehouse_staff', 'receptionist', 'admin']}><InventoryPage /></ProtectedRoute>
          } />
          <Route path="/portal" element={
            <ProtectedRoute roles={['customer']}><StatusPortalPage /></ProtectedRoute>
          } />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
