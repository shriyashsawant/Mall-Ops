import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import ManagerLayout from '../../components/ManagerLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Package, Plus, CheckCircle, Clock, AlertTriangle, XCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Inventory = ({ user }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  
  useEffect(() => {
    fetchRequests();
  }, []);
  
  const fetchRequests = async () => {
    try {
      const response = await axios.get(`${API}/inventory`, { withCredentials: true });
      setRequests(response.data);
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleUpdateStatus = async (requestId, status) => {
    try {
      await axios.put(`${API}/inventory/${requestId}?status=${status}`, {}, {
        withCredentials: true
      });
      toast.success(`Request ${status}`);
      fetchRequests();
    } catch (error) {
      console.error('Failed to update request:', error);
      toast.error('Failed to update request');
    }
  };
  
  const getStatusIcon = (status) => {
    switch (status) {
      case 'fulfilled': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <Clock className="w-4 h-4 text-amber-600" />;
    }
  };
  
  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };
  
  const filteredRequests = filter === 'all' 
    ? requests 
    : requests.filter(r => r.status === filter);
  
  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    fulfilled: requests.filter(r => r.status === 'fulfilled').length,
    rejected: requests.filter(r => r.status === 'rejected').length
  };
  
  if (loading) {
    return (
      <ManagerLayout user={user}>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
        </div>
      </ManagerLayout>
    );
  }
  
  return (
    <ManagerLayout user={user}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-1">Inventory Requests</h1>
          <p className="text-slate-600">Manage supply requests from supervisors</p>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 border border-slate-200 bg-white rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                <p className="text-xs text-slate-600">Total</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border border-slate-200 bg-white rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.pending}</p>
                <p className="text-xs text-slate-600">Pending</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border border-slate-200 bg-white rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.fulfilled}</p>
                <p className="text-xs text-slate-600">Fulfilled</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border border-slate-200 bg-white rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.rejected}</p>
                <p className="text-xs text-slate-600">Rejected</p>
              </div>
            </div>
          </Card>
        </div>
        
        {/* Filter */}
        <div className="flex gap-2">
          <Button variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}
            className={filter === 'all' ? 'bg-slate-900' : ''}>All</Button>
          <Button variant={filter === 'pending' ? 'default' : 'outline'} onClick={() => setFilter('pending')}
            className={filter === 'pending' ? 'bg-amber-600' : ''}>Pending</Button>
          <Button variant={filter === 'fulfilled' ? 'default' : 'outline'} onClick={() => setFilter('fulfilled')}
            className={filter === 'fulfilled' ? 'bg-green-600' : ''}>Fulfilled</Button>
          <Button variant={filter === 'rejected' ? 'default' : 'outline'} onClick={() => setFilter('rejected')}
            className={filter === 'rejected' ? 'bg-red-600' : ''}>Rejected</Button>
        </div>
        
        {/* Requests List */}
        {filteredRequests.length === 0 ? (
          <Card className="p-12 text-center border border-dashed border-slate-300">
            <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No inventory requests</h3>
            <p className="text-slate-600">Supervisors can request supplies from tasks</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((req) => (
              <Card key={req.request_id} className="p-5 border border-slate-200 bg-white rounded-xl shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900">{req.item_name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${getUrgencyColor(req.urgency)}`}>
                        {req.urgency.toUpperCase()}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                        Qty: {req.quantity}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500 mb-2">
                      <span>{req.store_info?.name || 'Unknown Store'}</span>
                      <span>{new Date(req.created_at).toLocaleDateString()}</span>
                    </div>
                    {req.notes && (
                      <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded">{req.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {getStatusIcon(req.status)}
                    {req.status === 'pending' && (
                      <>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700" 
                          onClick={() => handleUpdateStatus(req.request_id, 'fulfilled')}>
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => handleUpdateStatus(req.request_id, 'rejected')}>
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ManagerLayout>
  );
};

export default Inventory;
