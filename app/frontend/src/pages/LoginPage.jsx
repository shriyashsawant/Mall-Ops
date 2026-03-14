import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { MapPin, Shield, Camera, Building2, User, Lock, Mail, ArrowRight } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL || "http://localhost:8000").replace(/\/$/, "");
const API = `${BACKEND_URL}/api`;

const LoginPage = () => {
  const [activeTab, setActiveTab] = useState('manager');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API}/auth/login`, {
        email,
        password,
        role: activeTab
      }, {
        withCredentials: true
      });

      const { user } = response.data;
      
      if (user.role === 'manager') {
        navigate('/admin/dashboard', { state: { user } });
      } else {
        navigate('/app/tasks', { state: { user } });
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    localStorage.setItem('selected_role', activeTab);
    const redirectUrl = window.location.origin + '/auth/callback';
    const loginUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}&role=${activeTab}`;
    window.location.href = loginUrl;
  };
  
  return (
    <div className="min-h-screen flex">
      {/* Left Side - Hero */}
      <div 
        className="hidden lg:flex lg:w-1/2 relative"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1761333482894-700fc6aebd47?crop=entropy&cs=srgb&fm=jpg&q=85)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-slate-900/70"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-transparent to-slate-900/30"></div>
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-accent rounded-xl">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-5xl font-heading font-bold tracking-tight">
              Mall Command
            </h1>
          </div>
          <p className="text-xl text-slate-200 mb-8 leading-relaxed max-w-md font-body">
            High-precision command center for mall operations. GPS-verified execution, real-time accountability.
          </p>
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-amber-500/20 rounded-lg border border-amber-500/30">
                <MapPin className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-lg">Geofence Verification</h3>
                <p className="text-slate-400 text-sm">Tasks unlock only when supervisors are at the store location</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-emerald-500/20 rounded-lg border border-emerald-500/30">
                <Camera className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-lg">Photo Evidence</h3>
                <p className="text-slate-400 text-sm">Upload before/after photos with AI analysis</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
                <Shield className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-lg">Manager Approval</h3>
                <p className="text-slate-400 text-sm">Review and approve all task submissions</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right Side - Login */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center lg:hidden">
            <div className="inline-flex items-center justify-center p-3 bg-primary rounded-xl mb-4">
              <Building2 className="w-8 h-8 text-white" />
            </div>
          </div>
          
          <div className="text-center">
            <h2 className="text-3xl font-heading font-bold text-slate-900">Mall Command</h2>
            <p className="text-slate-600 mt-2 font-body">Sign in to continue</p>
          </div>

          {/* Role Tabs */}
          <div className="flex rounded-xl bg-slate-200 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('manager')}
              className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'manager' 
                  ? 'bg-white text-primary shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Shield className="w-4 h-4 inline-block mr-2" />
              Manager
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('supervisor')}
              className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'supervisor' 
                  ? 'bg-white text-primary shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-4 h-4 inline-block mr-2" />
              Supervisor
            </button>
          </div>

          {/* Login Form */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl font-heading">
                {activeTab === 'manager' ? 'Manager Login' : 'Supervisor Login'}
              </CardTitle>
              <p className="text-sm text-slate-500 font-body">
                {activeTab === 'manager' 
                  ? 'Access your command center to manage tasks and teams'
                  : 'Login to complete your assigned tasks'
                }
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="font-body">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 font-body"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="font-body">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 font-body"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm font-body">
                    {error}
                  </div>
                )}

                <Button 
                  type="submit"
                  className="w-full h-11 font-medium bg-primary hover:bg-primary-hover rounded-lg transition-all active:scale-95"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Signing in...
                    </div>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-slate-500">Or continue with</span>
                  </div>
                </div>

                <Button 
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full h-11 font-medium bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg transition-all"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google
                </Button>
              </form>
            </CardContent>
          </Card>
          
          <p className="text-xs text-center text-slate-500 font-body">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
