import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { MapPin, AlertCircle, Lock, LogOut, CheckCircle, ClipboardList, Calendar, Building2, Clock, User } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SupervisorTasks = ({ user }) => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  
  useEffect(() => {
    fetchTasks();
    getCurrentLocation();
  }, []);
  
  const fetchTasks = async () => {
    try {
      const response = await axios.get(`${API}/tasks`, {
        withCredentials: true
      });
      setTasks(response.data);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };
  
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported');
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (error) => {
        setLocationError(error.message);
        toast.error('Please enable location access');
      },
      { enableHighAccuracy: true }
    );
  };
  
  const calculateDistance = (storeLat, storeLng) => {
    if (!userLocation || !storeLat || !storeLng) return null;
    
    const R = 6371000;
    const lat1 = userLocation.lat * Math.PI / 180;
    const lat2 = storeLat * Math.PI / 180;
    const deltaLat = (storeLat - userLocation.lat) * Math.PI / 180;
    const deltaLng = (storeLng - userLocation.lng) * Math.PI / 180;
    
    const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLng/2) * Math.sin(deltaLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c;
  };
  
  const isWithinGeofence = (task) => {
    if (!userLocation) return false;
    const location = task.store_info?.location;
    if (!location || !location.lat || !location.lng) return true;
    const distance = calculateDistance(location.lat, location.lng);
    return distance !== null && distance <= (task.store_info?.radius || 100);
  };

  const getTimeRemaining = (deadline) => {
    const now = new Date();
    const due = new Date(deadline);
    const diff = due - now;
    
    if (diff < 0) return { text: 'Overdue', class: 'text-red-600' };
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return { text: `${days} day${days > 1 ? 's' : ''} left`, class: 'text-green-600' };
    if (hours > 0) return { text: `${hours} hour${hours > 1 ? 's' : ''} left`, class: 'text-amber-600' };
    return { text: 'Due soon', class: 'text-red-600' };
  };
  
  const handleTaskClick = async (task) => {
    if (!isWithinGeofence(task)) {
      const location = task.store_info?.location;
      if (location?.lat && location?.lng) {
        const distance = calculateDistance(location.lat, location.lng);
        toast.error(`You must be within ${task.store_info?.radius || 100}m of the store. Current distance: ${Math.round(distance)}m`);
      }
      return;
    }
    
    navigate(`/app/task/${task.task_id}`);
  };
  
  const handleLogout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      navigate('/login');
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-amber-100 text-amber-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mb-4 mx-auto"></div>
          <p className="text-slate-600">Loading your checklists...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Checklists</h1>
            <p className="text-sm text-slate-600">{tasks.length} checklist{tasks.length !== 1 ? 's' : ''} assigned</p>
          </div>
          <Button
            onClick={handleLogout}
            variant="ghost"
            size="sm"
            className="text-red-600 hover:bg-red-50"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Card className="p-4 bg-white border border-slate-200 rounded-xl mb-6">
          <div className="flex items-center gap-3">
            <img
              src={user?.picture || '/avatar.png'}
              alt={user?.name}
              className="w-12 h-12 rounded-full border-2 border-slate-200"
            />
            <div>
              <p className="font-semibold text-slate-900">{user?.name}</p>
              <p className="text-sm text-slate-600">{user?.email}</p>
            </div>
          </div>
        </Card>
        
        {locationError ? (
          <Card className="p-4 bg-red-50 border border-red-200 rounded-xl mb-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-900">Location Access Required</p>
                <p className="text-xs text-red-700 mt-1">Please enable location services to access checklists</p>
              </div>
            </div>
          </Card>
        ) : userLocation ? (
          <Card className="p-4 bg-green-50 border border-green-200 rounded-xl mb-6">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-900">Location Active</p>
                <p className="text-xs text-green-700 mt-1">Checklists will unlock when you're at the store</p>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-4 bg-slate-50 border border-slate-200 rounded-xl mb-6">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-900"></div>
              <p className="text-sm text-slate-600">Getting your location...</p>
            </div>
          </Card>
        )}
        
        {tasks.length === 0 ? (
          <Card className="p-12 text-center border border-dashed border-slate-300">
            <ClipboardList className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No checklists assigned</h3>
            <p className="text-slate-600">Check back later for new daily checklists</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const withinGeofence = isWithinGeofence(task);
              const location = task.store_info?.location;
              const distance = userLocation && location?.lat && location?.lng ? calculateDistance(location.lat, location.lng) : null;
              const timeInfo = getTimeRemaining(task.deadline);
              
              return (
                <Card
                  key={task.task_id}
                  onClick={() => handleTaskClick(task)}
                  className={`
                    p-5 rounded-xl shadow-sm cursor-pointer transition-all active:scale-98
                    ${withinGeofence 
                      ? 'border-l-4 border-l-green-500 bg-white hover:shadow-md' 
                      : 'border-l-4 border-l-slate-300 bg-slate-50 opacity-90'
                    }
                  `}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-slate-900">
                          {task.store_name || task.title}
                        </h3>
                        {task.priority && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-4 h-4" />
                          {task.city || 'Pune'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(task.deadline).toLocaleDateString()}
                        </span>
                      </div>
                      {distance !== null && (
                        <p className="text-sm text-slate-600 mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {Math.round(distance)}m away
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      {withinGeofence ? (
                        <div className="p-2 bg-green-100 rounded-lg">
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                      ) : (
                        <div className="p-2 bg-slate-200 rounded-lg">
                          <Lock className="w-6 h-6 text-slate-500" />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      {withinGeofence ? (
                        <span className="text-green-600 font-medium flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          Ready to submit
                        </span>
                      ) : (
                        <span className="text-slate-500 flex items-center gap-1">
                          <Lock className="w-4 h-4" />
                          Move closer to unlock
                        </span>
                      )}
                    </div>
                    <span className={`flex items-center gap-1 font-medium ${timeInfo.class}`}>
                      <Clock className="w-4 h-4" />
                      {timeInfo.text}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SupervisorTasks;
