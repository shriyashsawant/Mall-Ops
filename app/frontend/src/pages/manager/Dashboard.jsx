import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import ManagerLayout from '../../components/ManagerLayout';
import { 
  LayoutDashboard, Store, CheckCircle, XCircle, Clock, TrendingUp, 
  AlertTriangle, Flag, MapPin, Users, Camera, Navigation,
  Activity, ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";
const API = `${BACKEND_URL}/api`;

const Dashboard = ({ user }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);
  const [recentPhotos, setRecentPhotos] = useState([]);
  
  useEffect(() => {
    fetchStats();
    fetchRecentActivity();
    fetchRecentPhotos();
  }, []);
  
  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/stats`, {
        withCredentials: true
      });
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const response = await axios.get(`${API}/submissions?limit=5`, {
        withCredentials: true
      });
      setRecentActivity(response.data.slice(0, 5));
    } catch (error) {
      console.error('Failed to fetch activity:', error);
    }
  };

  const fetchRecentPhotos = async () => {
    try {
      const response = await axios.get(`${API}/submissions/pending`, { withCredentials: true });
      const submissions = response.data.filter(s => s.photos && s.photos.length > 0);
      const photos = [];
      submissions.forEach(sub => {
        sub.photos.slice(0, 2).forEach(photo => {
          photos.push({ photo, submission: sub });
        });
      });
      setRecentPhotos(photos.slice(0, 6));
    } catch (error) {
      console.error('Failed to fetch photos:', error);
    }
  };
  
  const getPriorityColor = (rate) => {
    if (rate >= 90) return "text-emerald-600";
    if (rate >= 70) return "text-amber-600";
    return "text-red-600";
  };

  const getActivityIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-amber-500" />;
    }
  };

  if (loading) {
    return (
      <ManagerLayout user={user}>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </ManagerLayout>
    );
  }
  
  return (
    <ManagerLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl md:text-4xl font-heading font-bold text-slate-900 mb-2" data-testid="dashboard-title">
            Command Center
          </h1>
          <p className="text-slate-600 font-body">Real-time operations overview for {user?.mall_name || 'All Malls'}</p>
        </div>

        {/* Alerts */}
        {(stats?.overdue_tasks > 0 || stats?.high_priority_pending > 0) && (
          <div className="space-y-2">
            {stats?.overdue_tasks > 0 && (
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 animate-pulse">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">{stats.overdue_tasks} overdue task(s) require attention</span>
              </div>
            )}
            {stats?.high_priority_pending > 0 && (
              <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-700">
                <Flag className="w-5 h-5" />
                <span className="font-medium">{stats.high_priority_pending} high priority task(s) pending</span>
              </div>
            )}
          </div>
        )}

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-12 gap-4">
          {/* Stats Row - 4 cards */}
          <Card className="col-span-3 stat-card p-5 rounded-xl" data-testid="stat-stores">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Store className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Stores</span>
            </div>
            <div className="text-3xl font-heading font-bold text-slate-900">{stats?.total_stores || 0}</div>
            <p className="text-xs text-slate-500 mt-1 font-body">Active locations</p>
          </Card>
          
          <Card className="col-span-3 stat-card p-5 rounded-xl" data-testid="stat-tasks">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <LayoutDashboard className="w-5 h-5 text-amber-600" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Tasks</span>
            </div>
            <div className="text-3xl font-heading font-bold text-slate-900">{stats?.total_tasks || 0}</div>
            <p className="text-xs text-slate-500 mt-1 font-body">Total assigned</p>
          </Card>
          
          <Card className="col-span-3 stat-card p-5 rounded-xl" data-testid="stat-pending">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Pending</span>
            </div>
            <div className="text-3xl font-heading font-bold text-slate-900">{stats?.pending_submissions || 0}</div>
            <p className="text-xs text-slate-500 mt-1 font-body">Awaiting review</p>
          </Card>
          
          <Card className="col-span-3 stat-card p-5 rounded-xl" data-testid="stat-rate">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Rate</span>
            </div>
            <div className={`text-3xl font-heading font-bold ${getPriorityColor(stats?.completion_rate || 0)}`}>
              {stats?.completion_rate || 0}%
            </div>
            <p className="text-xs text-slate-500 mt-1 font-body">Completion rate</p>
          </Card>

          {/* Live Photo Feed */}
          <Card className="col-span-4 p-5 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Camera className="w-5 h-5 text-purple-500" />
                Live Feed
              </h2>
              <span className="text-xs text-slate-500">Recent uploads</span>
            </div>
            {recentPhotos.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {recentPhotos.map((item, idx) => (
                  <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-slate-100 relative group">
                    <img 
                      src={`data:image/jpeg;base64,${item.photo}`} 
                      alt={`Photo ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-xs font-medium">
                        {item.submission?.task_info?.title?.slice(0, 10) || 'Task'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <Camera className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No photos yet</p>
              </div>
            )}
          </Card>

          {/* Map View - God View */}
          <Card className="col-span-8 row-span-2 p-6 rounded-xl overflow-hidden" data-testid="map-view">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-heading font-semibold text-slate-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-amber-500" />
                God View
              </h2>
              <span className="text-xs font-body text-slate-500">Live geofence monitoring</span>
            </div>
            <div className="relative w-full h-80 bg-slate-100 rounded-lg overflow-hidden">
              {/* Placeholder Map - In production, use react-leaflet */}
              <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200">
                {/* Grid lines for map effect */}
                <div className="absolute inset-0" style={{
                  backgroundImage: `
                    linear-gradient(to right, rgba(0,0,0,0.03) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(0,0,0,0.03) 1px, transparent 1px)
                  `,
                  backgroundSize: '40px 40px'
                }}></div>
                
                {/* Mock Store Locations with Geofence Rings */}
                {stats?.store_stats?.slice(0, 4).map((store, idx) => (
                  <div
                    key={store.store_id}
                    className="absolute"
                    style={{
                      left: `${20 + idx * 20}%`,
                      top: `${30 + (idx % 2) * 30}%`,
                    }}
                  >
                    {/* Geofence Ring - Amber */}
                    <div className="absolute w-24 h-24 -translate-x-1/2 -translate-y-1/2 rounded-full geofence-ring"
                      style={{ border: '2px dashed #f59e0b', animationDelay: `${idx * 0.5}s` }}
                    ></div>
                    {/* Store Pin - Blue */}
                    <div className="relative flex flex-col items-center">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg">
                        <Store className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-xs font-medium text-slate-700 mt-1 bg-white/80 px-2 py-0.5 rounded">
                        {store.store_name?.substring(0, 10)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Map Legend */}
              <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur rounded-lg p-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <span className="text-slate-600">Geofence</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-3 h-3 rounded-full bg-primary"></div>
                  <span className="text-slate-600">Store</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Live Feed - Real-time updates (col-span-4 row-span-2) */}
          <Card className="col-span-4 row-span-2 p-5 rounded-xl" data-testid="live-feed">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-heading font-semibold text-slate-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-500" />
                Live Feed
              </h2>
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {recentActivity.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4 font-body">No recent activity</p>
              ) : (
                recentActivity.map((activity, idx) => (
                  <div key={activity.submission_id || idx} className="flex items-start gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors">
                    <div className="mt-0.5">{getActivityIcon(activity.status)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {activity.task_info?.title || 'Task'}
                      </p>
                      <p className="text-xs text-slate-500 font-body">
                        {activity.supervisor_info?.name || 'Supervisor'} • {activity.status}
                      </p>
                    </div>
                    <span className="text-xs text-slate-400">
                      {new Date(activity.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Quick Stats Row */}
          <Card className="col-span-4 p-4 rounded-xl" data-testid="stat-overdue">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Overdue</p>
                <p className="text-2xl font-heading font-bold text-red-600">{stats?.overdue_tasks || 0}</p>
              </div>
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </Card>

          <Card className="col-span-4 p-4 rounded-xl" data-testid="stat-approved">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Approved</p>
                <p className="text-2xl font-heading font-bold text-emerald-600">{stats?.approved_submissions || 0}</p>
              </div>
              <div className="p-2 bg-emerald-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </Card>

          <Card className="col-span-4 p-4 rounded-xl" data-testid="stat-rejected">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Rejected</p>
                <p className="text-2xl font-heading font-bold text-red-600">{stats?.rejected_submissions || 0}</p>
              </div>
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card className="col-span-12 p-5 rounded-xl">
            <h2 className="text-lg font-heading font-semibold text-slate-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button 
                onClick={() => window.location.href = '/admin/stores'}
                data-testid="add-store-btn"
                className="h-14 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                <Store className="w-4 h-4 mr-2" />
                Add Store
              </Button>
              <Button 
                onClick={() => window.location.href = '/admin/tasks'}
                data-testid="create-task-btn"
                className="h-14 text-sm font-medium bg-amber-600 hover:bg-amber-700 text-white rounded-lg"
              >
                <LayoutDashboard className="w-4 h-4 mr-2" />
                Create Task
              </Button>
              <Button 
                onClick={() => window.location.href = '/admin/submissions'}
                data-testid="review-submissions-btn"
                className="h-14 text-sm font-medium bg-orange-600 hover:bg-orange-700 text-white rounded-lg"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Review
              </Button>
              <Button 
                onClick={() => window.location.href = '/admin/reports'}
                data-testid="reports-btn"
                className="h-14 text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Reports
              </Button>
            </div>
          </Card>
        </div>

        {/* Per-Store Stats Table */}
        {stats?.store_stats && stats.store_stats.length > 0 && (
          <Card className="p-6 rounded-xl">
            <h2 className="text-xl font-heading font-semibold text-slate-900 mb-4">Store Performance</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-slate-500 border-b border-slate-200">
                    <th className="pb-3 font-medium font-body">Store</th>
                    <th className="pb-3 font-medium font-body">Tasks</th>
                    <th className="pb-3 font-medium font-body">Completed</th>
                    <th className="pb-3 font-medium font-body">Pending</th>
                    <th className="pb-3 font-medium font-body">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.store_stats.map((store) => (
                    <tr key={store.store_id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="py-3 font-medium text-slate-900 font-body">{store.store_name}</td>
                      <td className="py-3 text-slate-600 font-body">{store.total_tasks}</td>
                      <td className="py-3 text-emerald-600 font-body">{store.completed}</td>
                      <td className="py-3 text-amber-600 font-body">{store.pending}</td>
                      <td className="py-3">
                        <span className={`font-bold font-body ${getPriorityColor(store.completion_rate)}`}>
                          {store.completion_rate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </ManagerLayout>
  );
};

export default Dashboard;
