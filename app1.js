import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import '@/App.css';

// Pages
import LoginPage from './pages/LoginPage';
import AuthCallback from './pages/AuthCallback';
import ManagerDashboard from './pages/manager/Dashboard';
import ManagerStores from './pages/manager/Stores';
import ManagerTasks from './pages/manager/Tasks';
import ManagerSubmissions from './pages/manager/Submissions';
import ManagerReports from './pages/manager/Reports';
import SupervisorTasks from './pages/supervisor/Tasks';
import SupervisorTaskDetail from './pages/supervisor/TaskDetail';
import ProtectedRoute from './components/ProtectedRoute';

function AppRouter() {
  const location = useLocation();
  
  // CRITICAL: Detect session_id in URL fragment synchronously to prevent race conditions
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }
  
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />
      
      {/* Manager Routes */}
      <Route path="/admin/dashboard" element={
        <ProtectedRoute requiredRole="manager">
          <ManagerDashboard />
        </ProtectedRoute>
      } />
      <Route path="/admin/stores" element={
        <ProtectedRoute requiredRole="manager">
          <ManagerStores />
        </ProtectedRoute>
      } />
      <Route path="/admin/tasks" element={
        <ProtectedRoute requiredRole="manager">
          <ManagerTasks />
        </ProtectedRoute>
      } />
      <Route path="/admin/submissions" element={
        <ProtectedRoute requiredRole="manager">
          <ManagerSubmissions />
        </ProtectedRoute>
      } />
      <Route path="/admin/reports" element={
        <ProtectedRoute requiredRole="manager">
          <ManagerReports />
        </ProtectedRoute>
      } />
      
      {/* Supervisor Routes */}
      <Route path="/app/tasks" element={
        <ProtectedRoute requiredRole="supervisor">
          <SupervisorTasks />
        </ProtectedRoute>
      } />
      <Route path="/app/task/:taskId" element={
        <ProtectedRoute requiredRole="supervisor">
          <SupervisorTaskDetail />
        </ProtectedRoute>
      } />
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AppRouter />
        <Toaster position="top-center" richColors />
      </BrowserRouter>
    </div>
  );
}

export default App;