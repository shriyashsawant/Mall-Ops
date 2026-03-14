import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL || "http://localhost:8000").replace(/\/+$/, "");
const API = `${BACKEND_URL}/api`;

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const hasProcessed = useRef(false);
  
  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;
    
    const processSession = async () => {
      try {
        const hash = location.hash;
        const params = new URLSearchParams(hash.substring(1));
        const sessionId = params.get('session_id');
        
        if (!sessionId) {
          console.error('No session_id in URL');
          navigate('/login');
          return;
        }
        
        const searchParams = new URLSearchParams(location.search);
        let role = searchParams.get('role') || localStorage.getItem('selected_role') || 'supervisor';
        let mallName = searchParams.get('mall_name') || localStorage.getItem('selected_mall') || '';
        localStorage.removeItem('selected_role');
        localStorage.removeItem('selected_mall');
        
        const response = await axios.post(`${API}/auth/session`, {
          session_id: sessionId,
          role: role,
          mall_name: mallName
        }, {
          withCredentials: true
        });
        
        const { user } = response.data;
        
        if (user.role === 'manager') {
          navigate('/admin/dashboard', { state: { user }, replace: true });
        } else {
          navigate('/app/tasks', { state: { user }, replace: true });
        }
      } catch (error) {
        console.error('Auth callback failed:', error);
        navigate('/login');
      }
    };
    
    processSession();
  }, [location, navigate]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mb-4"></div>
        <p className="text-slate-600">Authenticating...</p>
      </div>
    </div>
  );
};

export default AuthCallback;

