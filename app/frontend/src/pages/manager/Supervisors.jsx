import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import ManagerLayout from '../../components/ManagerLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { User, Mail, Lock, Plus, Trash2, Shield, Building2, MapPin, Search } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL || "http://localhost:8000").replace(/\/+$/, "");
const API = `${BACKEND_URL}/api`;

const Supervisors = ({ user }) => {
  const [supervisors, setSupervisors] = useState([]);
  const [malls, setMalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [newSupervisor, setNewSupervisor] = useState({ 
    name: '', 
    email: '', 
    password: '' 
  });
  
  const [assignData, setAssignData] = useState({
    supervisor_id: '',
    mall_name: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [supervisorsRes, mallsRes] = await Promise.all([
        axios.get(`${API}/supervisors`, { withCredentials: true }),
        axios.get(`${API}/malls/list`, { withCredentials: true })
      ]);
      setSupervisors(supervisorsRes.data);
      setMalls(mallsRes.data.malls || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load supervisors data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSupervisor = async (e) => {
    e.preventDefault();
    if (!newSupervisor.name || !newSupervisor.email || !newSupervisor.password) {
      toast.error('Please fill all fields');
      return;
    }

    try {
      const response = await axios.post(`${API}/supervisors`, newSupervisor, { withCredentials: true });
      toast.success('Supervisor created and welcome email sent via SendGrid!');
      setIsAddDialogOpen(false);
      setNewSupervisor({ name: '', email: '', password: '' });
      fetchData();
    } catch (error) {
      console.error('Failed to create supervisor:', error);
      toast.error(error.response?.data?.detail || 'Failed to create supervisor');
    }
  };

  const handleAssignMall = async (e) => {
    e.preventDefault();
    if (!assignData.supervisor_id || !assignData.mall_name) {
      toast.error('Please select both supervisor and mall');
      return;
    }

    try {
      await axios.put(
        `${API}/supervisors/${assignData.supervisor_id}/assign-mall?mall_name=${encodeURIComponent(assignData.mall_name)}`,
        {},
        { withCredentials: true }
      );
      toast.success('Mall assigned successfully');
      setIsAssignDialogOpen(false);
      setAssignData({ supervisor_id: '', mall_name: '' });
      fetchData();
    } catch (error) {
      console.error('Failed to assign mall:', error);
      toast.error(error.response?.data?.detail || 'Failed to assign mall');
    }
  };

  const filteredSupervisors = supervisors.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.mall_name && s.mall_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading && supervisors.length === 0) {
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
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Supervisor Management</h1>
            <p className="text-slate-500 mt-1">Manage your team and their mall assignments</p>
          </div>
          
          <div className="flex gap-3">
            <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-slate-200 hover:bg-slate-50">
                  <Building2 className="w-4 h-4 mr-2" />
                  Assign Mall
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Mall to Supervisor</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAssignMall} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Select Supervisor</Label>
                    <Select 
                      value={assignData.supervisor_id} 
                      onValueChange={v => setAssignData({...assignData, supervisor_id: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a supervisor" />
                      </SelectTrigger>
                      <SelectContent>
                        {supervisors.map(s => (
                          <SelectItem key={s.user_id} value={s.user_id}>{s.name} ({s.email})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Select Mall</Label>
                    <Select 
                      value={assignData.mall_name} 
                      onValueChange={v => setAssignData({...assignData, mall_name: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a mall" />
                      </SelectTrigger>
                      <SelectContent>
                        {malls.map(mall => (
                          <SelectItem key={mall} value={mall}>{mall}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full bg-slate-900 text-white">Update Assignment</Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-md">
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Supervisor
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Supervisor Account</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateSupervisor} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input 
                        className="pl-10"
                        placeholder="John Doe"
                        value={newSupervisor.name}
                        onChange={e => setNewSupervisor({...newSupervisor, name: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input 
                        type="email"
                        className="pl-10"
                        placeholder="john@example.com"
                        value={newSupervisor.email}
                        onChange={e => setNewSupervisor({...newSupervisor, email: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Initial Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input 
                        type="password"
                        className="pl-10"
                        placeholder="••••••••"
                        value={newSupervisor.password}
                        onChange={e => setNewSupervisor({...newSupervisor, password: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                  <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-800">
                    <Shield className="w-4 h-4 inline mr-2" />
                    An automated welcome email with these credentials will be sent via SendGrid.
                  </div>
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white">Create & Send Invite</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search by name, email or mall..." 
            className="pl-10 bg-white border-slate-200"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSupervisors.map((sup) => (
            <Card key={sup.user_id} className="overflow-hidden border-slate-200 hover:border-blue-200 transition-all hover:shadow-lg">
              <CardHeader className="pb-2 bg-slate-50/50">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full border-2 border-white shadow-sm overflow-hidden bg-white">
                      <img src={sup.picture || `https://api.dicebear.com/7.x/initials/svg?seed=${sup.name}`} alt={sup.name} className="h-full w-full object-cover" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{sup.name}</CardTitle>
                      <p className="text-sm text-slate-500 truncate max-w-[150px]">{sup.email}</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    Supervisor
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span className="font-medium">Assigned Mall:</span>
                  {sup.mall_name ? (
                    <span className="text-green-700 bg-green-50 px-2 py-0.5 rounded text-xs font-semibold uppercase">{sup.mall_name}</span>
                  ) : (
                    <span className="text-slate-400 italic">None</span>
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-blue-600 text-sm"
                    onClick={() => {
                        setAssignData({...assignData, supervisor_id: sup.user_id, mall_name: sup.mall_name || ''});
                        setIsAssignDialogOpen(true);
                    }}
                  >
                    Change Assignment
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredSupervisors.length === 0 && (
            <div className="col-span-full py-12 text-center bg-white rounded-xl border border-dashed border-slate-300">
              <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No supervisors found matching "{searchQuery}"</p>
              <Button variant="link" onClick={() => setSearchQuery('')} className="mt-1">Clear search</Button>
            </div>
          )}
        </div>
      </div>
    </ManagerLayout>
  );
};

export default Supervisors;
