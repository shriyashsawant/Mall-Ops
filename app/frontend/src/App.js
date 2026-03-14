import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import { Toaster } from "sonner";

import LoginPage from "./pages/LoginPage";
import AuthCallback from "./pages/AuthCallback";
import ProtectedRoute from "./components/ProjectedRoute";
import ManagerLayout from "./components/ManagerLayout";

import Dashboard from "./pages/manager/Dashboard";
import Stores from "./pages/manager/Stores";
import Tasks from "./pages/manager/Tasks";
import Templates from "./pages/manager/Templates";
import Submissions from "./pages/manager/Submissions";
import Reports from "./pages/manager/Reports";
import Assignments from "./pages/manager/Assignments";
import Supervisors from "./pages/manager/Supervisors";
import Inventory from "./pages/manager/Inventory";

import SupervisorTasks from "./pages/supervisor/Tasks";
import SupervisorTaskDetail from "./pages/supervisor/TaskDetail";

const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL || "http://localhost:8000").replace(/\/+$/, "");
const API = `${BACKEND_URL}/api`;

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        withCredentials: true,
      });
      setUser(response.data);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
      setUser(null);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="App">
      <Toaster position="top-right" />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallback onLogin={setUser} />} />
          
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute user={user} requiredRole="manager">
                <ManagerLayout user={user} onLogout={handleLogout}>
                  <Routes>
                    <Route index element={<Navigate to="/admin/dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard user={user} />} />
                    <Route path="stores" element={<Stores user={user} />} />
                    <Route path="tasks" element={<Tasks user={user} />} />
                    <Route path="submissions" element={<Submissions user={user} />} />
                    <Route path="reports" element={<Reports user={user} />} />
                    <Route path="assignments" element={<Assignments user={user} />} />
                    <Route path="supervisors" element={<Supervisors user={user} />} />
                    <Route path="inventory" element={<Inventory user={user} />} />
                  </Routes>
                </ManagerLayout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/app/*"
            element={
              <ProtectedRoute user={user} requiredRole="supervisor">
                <Routes>
                  <Route index element={<Navigate to="/app/tasks" replace />} />
                  <Route path="tasks" element={<SupervisorTasks user={user} onLogout={handleLogout} />} />
                  <Route path="task/:taskId" element={<SupervisorTaskDetail user={user} />} />
                </Routes>
              </ProtectedRoute>
            }
          />
          
          <Route path="/" element={user ? (user.role === "manager" ? <Navigate to="/admin/dashboard" /> : <Navigate to="/app/tasks" />) : <Navigate to="/login" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;

