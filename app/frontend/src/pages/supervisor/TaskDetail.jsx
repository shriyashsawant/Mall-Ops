import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { MapPin, Camera, CheckCircle, XCircle, Clock, Building2, Calendar, AlertTriangle, FileText } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const API = `${BACKEND_URL}/api`;

const SupervisorTaskDetail = ({ user }) => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [locationData, setLocationData] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [photos, setPhotos] = useState([]);
  const [checklist, setChecklist] = useState([]);
  const [additionalRemarks, setAdditionalRemarks] = useState('');
  const [issuesNoted, setIssuesNoted] = useState('');
  const [actionRequired, setActionRequired] = useState('');
  const [signature, setSignature] = useState(null);
  const [isWithinGeofence, setIsWithinGeofence] = useState(false);

  useEffect(() => {
    fetchTask();
    getLocation();
  }, [taskId]);

  const fetchTask = async () => {
    try {
      const response = await axios.get(`${API}/tasks/${taskId}`, { withCredentials: true });
      setTask(response.data);
      
      // Initialize checklist from API
      const items = (response.data.checklist_items || []).map((item, idx) => ({
        sr_no: idx + 1,
        activity: item,
        status: '',
        observation: ''
      }));
      setChecklist(items);
    } catch (error) {
      console.error('Failed to fetch task:', error);
      toast.error('Failed to load task');
    } finally {
      setLoading(false);
    }
  };

  const getLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLoc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setLocationData(userLoc);
        
        if (task && task.store_info?.location) {
          checkGeofence(userLoc, task.store_info.location);
        }
      },
      (error) => {
        setLocationError('Unable to get location. Please enable GPS.');
      }
    );
  };

  const checkGeofence = (userLoc, storeLocation) => {
    if (!storeLocation || !storeLocation.lat || !storeLocation.lng) {
      setIsWithinGeofence(true);
      return;
    }
    const distance = calculateDistance(
      userLoc.lat, userLoc.lng,
      storeLocation.lat, storeLocation.lng
    );
    setIsWithinGeofence(distance <= (task?.store_info?.radius || 100));
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) {
      return 999999999;
    }
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  useEffect(() => {
    if (task && locationData && task.store_info?.location) {
      checkGeofence(locationData, task.store_info.location);
    }
  }, [task, locationData]);

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        setPhotos(prev => [...prev, base64]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSignatureUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        setSignature(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChecklistChange = (index, field, value) => {
    const updated = [...checklist];
    updated[index][field] = value;
    setChecklist(updated);
  };

  const getCompletionStats = () => {
    const total = checklist.length;
    const completed = checklist.filter(item => item.status !== '').length;
    const okCount = checklist.filter(item => item.status === 'OK').length;
    const notOkCount = checklist.filter(item => item.status === 'Not OK').length;
    return { total, completed, okCount, notOkCount };
  };

  const stats = getCompletionStats();

  const handleSubmit = async () => {
    if (!isWithinGeofence) {
      toast.error('You must be at the store location to submit');
      return;
    }

    const allChecked = checklist.every(item => item.status !== '');
    if (!allChecked) {
      toast.error('Please fill status for all checklist items');
      return;
    }

    if (task.photo_required && photos.length === 0) {
      toast.error('Please upload at least one photo');
      return;
    }

    setSubmitting(true);
    try {
      const submissionData = {
        task_id: taskId,
        photos: photos,
        before_photos: [],
        remarks: JSON.stringify({ 
          checklist: checklist, 
          additional_remarks: additionalRemarks,
          issues_noted: issuesNoted,
          action_required: actionRequired,
          signature: signature 
        }),
        latitude: locationData?.lat || 0,
        longitude: locationData?.lng || 0
      };

      await axios.post(`${API}/submissions`, submissionData, { withCredentials: true });

      toast.success('Checklist submitted successfully');
      navigate('/app/tasks');
    } catch (error) {
      console.error('Failed to submit:', error);
      toast.error(error.response?.data?.detail || 'Failed to submit checklist');
    } finally {
      setSubmitting(false);
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
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Daily Checklist</h1>
              <p className="text-sm text-slate-600">{task?.store_name || task?.store_info?.name}</p>
            </div>
            <Button variant="outline" onClick={() => navigate('/app/tasks')}>Back</Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        {/* Progress Card */}
        <Card className="p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">Completion Progress</span>
            <span className="text-sm opacity-90">{stats.completed}/{stats.total} items</span>
          </div>
          <div className="w-full bg-blue-800 rounded-full h-2 mb-3">
            <div 
              className="bg-white h-2 rounded-full transition-all" 
              style={{ width: `${(stats.completed/stats.total)*100}%` }}
            ></div>
          </div>
          <div className="flex gap-4 text-sm">
            <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-green-300" /> OK: {stats.okCount}</span>
            <span className="flex items-center gap-1"><XCircle className="w-4 h-4 text-red-300" /> Not OK: {stats.notOkCount}</span>
          </div>
        </Card>

        {/* Store Info */}
        <Card className="p-4 bg-white border border-slate-200 rounded-xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-slate-500">Store Code</p>
              <p className="font-semibold">{task?.store_code || '-'}</p>
            </div>
            <div>
              <p className="text-slate-500">Store Name</p>
              <p className="font-semibold">{task?.store_name || task?.store_info?.name}</p>
            </div>
            <div>
              <p className="text-slate-500">City</p>
              <p className="font-semibold">{task?.city || 'Pune'}</p>
            </div>
            <div>
              <p className="text-slate-500">Due Date</p>
              <p className="font-semibold">{new Date(task?.deadline).toLocaleDateString()}</p>
            </div>
          </div>
        </Card>

        {/* Location Status */}
        {locationError ? (
          <Card className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-center gap-3">
              <XCircle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-900">Location Required</p>
                <p className="text-xs text-red-700">{locationError}</p>
              </div>
            </div>
          </Card>
        ) : locationData ? (
          <Card className={`p-4 border rounded-xl ${isWithinGeofence ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
            <div className="flex items-center gap-3">
              {isWithinGeofence ? <CheckCircle className="w-5 h-5 text-green-600" /> : <Clock className="w-5 h-5 text-amber-600" />}
              <div>
                <p className="text-sm font-medium">{isWithinGeofence ? 'Location Verified ✓' : 'Move closer to store'}</p>
                <p className="text-xs text-slate-600">
                  {isWithinGeofence ? 'You can now submit the checklist' : 'Geofencing active - must be at store location'}
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-900"></div>
              <p className="text-sm text-slate-600">Getting location...</p>
            </div>
          </Card>
        )}
      </div>

      {/* Checklist Table */}
      <div className="max-w-4xl mx-auto px-4">
        <Card className="overflow-hidden border border-slate-200 rounded-xl">
          <div className="bg-slate-800 text-white px-4 py-3 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            <h3 className="font-semibold">Checklist Items</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-3 py-3 text-left font-semibold text-slate-700 w-16">Sr.No.</th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-700">Activity</th>
                  <th className="px-3 py-3 text-center font-semibold text-slate-700 w-32">Status</th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-700">Observation</th>
                </tr>
              </thead>
              <tbody>
                {checklist.map((item, idx) => (
                  <tr key={idx} className={`border-t border-slate-200 ${item.status === 'Not OK' ? 'bg-red-50' : ''}`}>
                    <td className="px-3 py-3 text-slate-600">{item.sr_no}</td>
                    <td className="px-3 py-3 text-slate-900">{item.activity}</td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleChecklistChange(idx, 'status', 'OK')}
                          className={`p-2 rounded-lg border-2 transition-all ${
                            item.status === 'OK' 
                              ? 'border-green-500 bg-green-50 text-green-600' 
                              : 'border-slate-200 hover:border-green-300'
                          }`}
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleChecklistChange(idx, 'status', 'Not OK')}
                          className={`p-2 rounded-lg border-2 transition-all ${
                            item.status === 'Not OK' 
                              ? 'border-red-500 bg-red-50 text-red-600' 
                              : 'border-slate-200 hover:border-red-300'
                          }`}
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <Input
                        value={item.observation}
                        onChange={(e) => handleChecklistChange(idx, 'observation', e.target.value)}
                        placeholder="Enter observation..."
                        className="text-sm"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Issues Noted - Only show if there are Not OK items */}
        {checklist.some(item => item.status === 'Not OK') && (
          <Card className="p-6 border border-red-200 rounded-xl mt-4 bg-red-50">
            <h3 className="text-lg font-semibold text-red-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Issues Noted (Items marked Not OK)
            </h3>
            <Textarea
              value={issuesNoted}
              onChange={(e) => setIssuesNoted(e.target.value)}
              placeholder="Describe the issues found during inspection..."
              rows={3}
              className="bg-white"
            />
            <div className="mt-3">
              <Label className="text-red-800">Action Required</Label>
              <Textarea
                value={actionRequired}
                onChange={(e) => setActionRequired(e.target.value)}
                placeholder="What action needs to be taken to resolve these issues?"
                rows={2}
                className="mt-1 bg-white"
              />
            </div>
          </Card>
        )}

        {/* Additional Remarks */}
        <Card className="p-6 border border-slate-200 rounded-xl mt-4">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Additional Remarks</h3>
          <Textarea
            value={additionalRemarks}
            onChange={(e) => setAdditionalRemarks(e.target.value)}
            placeholder="Enter any additional observations, comments, or notes..."
            rows={4}
          />
        </Card>

        {/* Photos */}
        <Card className="p-6 border border-slate-200 rounded-xl mt-4">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Photo Evidence</h3>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            {photos.map((photo, idx) => (
              <div key={idx} className="relative aspect-square bg-slate-100 rounded-lg overflow-hidden">
                <img 
                  src={`data:image/jpeg;base64,${photo}`} 
                  alt={`Photo ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => setPhotos(photos.filter((_, i) => i !== idx))}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            ))}
            <label className="aspect-square border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-slate-400 transition-colors">
              <input type="file" accept="image/*" onChange={handlePhotoUpload} multiple className="hidden" />
              <Camera className="w-8 h-8 text-slate-400" />
            </label>
          </div>
        </Card>

        {/* Signature */}
        <Card className="p-6 border border-slate-200 rounded-xl mt-4">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Sign by Supervisor</h3>
          {signature ? (
            <div className="relative inline-block">
              <img 
                src={`data:image/jpeg;base64,${signature}`} 
                alt="Signature"
                className="max-h-24 border border-slate-200 rounded"
              />
              <button
                onClick={() => setSignature(null)}
                className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="block w-full h-24 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-slate-400 transition-colors">
              <input type="file" accept="image/*" onChange={handleSignatureUpload} className="hidden" />
              <span className="text-slate-500">Tap to add signature</span>
            </label>
          )}
        </Card>
      </div>

      {/* Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4">
        <div className="max-w-4xl mx-auto">
          <Button
            onClick={handleSubmit}
            disabled={submitting || !isWithinGeofence}
            className="w-full bg-green-600 hover:bg-green-700 text-lg py-6"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Submitting...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Submit Checklist
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SupervisorTaskDetail;
