import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import ManagerLayout from '../../components/ManagerLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { User, Store, Plus, Trash2, Users, MapPin, Building2 } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
const API = `${BACKEND_URL}/api`;

const Assignments = ({ user }) => {
  const [assignments, setAssignments] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [stores, setStores] = useState([]);
  const [malls, setMalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isMallDialogOpen, setIsMallDialogOpen] = useState(false);
  const [isAddSupervisorOpen, setIsAddSupervisorOpen] = useState(false);
  const [newAssignment, setNewAssignment] = useState({ supervisor_id: '', store_id: '' });
  const [selectedSupervisor, setSelectedSupervisor] = useState(null);
  const [selectedMall, setSelectedMall] = useState('');
  const [newSupervisor, setNewSupervisor] = useState({ name: '', email: '', password: '' });
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    try {
      const [assignmentsRes, supervisorsRes, storesRes, mallsRes] = await Promise.all([
        axios.get(`${API}/assignments`, { withCredentials: true }),
        axios.get(`${API}/supervisors`, { withCredentials: true }),
        axios.get(`${API}/stores`, { withCredentials: true }),
        axios.get(`${API}/malls/list`, { withCredentials: true })
      ]);
      setAssignments(assignmentsRes.data);
      setSupervisors(supervisorsRes.data);
      setStores(storesRes.data);
      setMalls(mallsRes.data.malls || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load assignments');
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
      await axios.post(`${API}/supervisors`, {
        name: newSupervisor.name,
        email: newSupervisor.email,
        password: newSupervisor.password
      }, { withCredentials: true });
      
      toast.success('Supervisor created successfully');
      setIsAddSupervisorOpen(false);
      setNewSupervisor({ name: '', email: '', password: '' });
      fetchData();
    } catch (error) {
      console.error('Failed to create supervisor:', error);
      toast.error(error.response?.data?.detail || 'Failed to create supervisor');
    }
  };
  
  const handleAssignMall = async (e) => {
    e.preventDefault();
    if (!selectedSupervisor || !selectedMall) {
      toast.error('Please select supervisor and mall');
      return;
    }
    
    try {
      await axios.put(
        `${API}/supervisors/${selectedSupervisor}/assign-mall?mall_name=${encodeURIComponent(selectedMall)}`,
        {},
        { withCredentials: true }
      );
      
      toast.success('Supervisor assigned to mall successfully');
      setIsMallDialogOpen(false);
      setSelectedSupervisor('');
      setSelectedMall('');
      fetchData();
    } catch (error) {
      console.error('Failed to assign mall:', error);
      toast.error(error.response?.data?.detail || 'Failed to assign supervisor to mall');
    }
  };
  
  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!newAssignment.supervisor_id || !newAssignment.store_id) {
      toast.error('Please select both supervisor and store');
      return;
    }
    
    try {
      await axios.post(`${API}/assignments?supervisor_id=${newAssignment.supervisor_id}&store_id=${newAssignment.store_id}`, {}, {
        withCredentials: true
      });
      
      toast.success('Assignment created successfully');
      setIsDialogOpen(false);
      setNewAssignment({ supervisor_id: '', store_id: '' });
      fetchData();
    } catch (error) {
      console.error('Failed to create assignment:', error);
      toast.error(error.response?.data?.detail || 'Failed to create assignment');
    }
  };
  
  const handleDeleteAssignment = async (assignmentId) => {
    if (!window.confirm('Remove this assignment?')) return;
    
    try {
      await axios.delete(`${API}/assignments/${assignmentId}`, { withCredentials: true });
      toast.success('Assignment removed');
      fetchData();
    } catch (error) {
      console.error('Failed to delete assignment:', error);
      toast.error('Failed to remove assignment');
    }
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
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-1">Supervisor Assignments</h1>
            <p className="text-slate-600">Assign supervisors to malls and stores</p>
          </div>
          
          <div className="flex gap-2">
            <Dialog open={isAddSupervisorOpen} onOpenChange={setIsAddSupervisorOpen}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-5 py-2 font-medium">
                  <User className="w-4 h-4 mr-2" />
                  Add Supervisor
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Supervisor</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateSupervisor} className="space-y-4">
                  <div>
                    <Label>Full Name</Label>
                    <Input 
                      value={newSupervisor.name}
                      onChange={e => setNewSupervisor({...newSupervisor, name: e.target.value})}
                      placeholder="John Doe"
                      required
                      className="bg-white"
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input 
                      type="email"
                      value={newSupervisor.email}
                      onChange={e => setNewSupervisor({...newSupervisor, email: e.target.value})}
                      placeholder="john@example.com"
                      required
                      className="bg-white"
                    />
                  </div>
                  <div>
                    <Label>Password</Label>
                    <Input 
                      type="password"
                      value={newSupervisor.password}
                      onChange={e => setNewSupervisor({...newSupervisor, password: e.target.value})}
                      placeholder="••••••••"
                      required
                      className="bg-white"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
                    Create Supervisor
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
            
            <Dialog open={isMallDialogOpen} onOpenChange={setIsMallDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-amber-600 hover:bg-amber-700 text-white rounded-lg px-5 py-2 font-medium">
                  <Building2 className="w-4 h-4 mr-2" />
                  Assign to Mall
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Assign Supervisor to Mall</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAssignMall} className="space-y-4">
                  <div>
                    <Label>Supervisor</Label>
                    <Select value={selectedSupervisor} onValueChange={setSelectedSupervisor}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select supervisor" />
                      </SelectTrigger>
                      <SelectContent>
                        {supervisors.map((sup) => (
                          <SelectItem key={sup.user_id} value={sup.user_id}>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              {sup.name}
                              {sup.mall_name && <span className="text-xs text-slate-500">({sup.mall_name})</span>}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Mall</Label>
                    <Select value={selectedMall} onValueChange={setSelectedMall}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select mall" />
                      </SelectTrigger>
                      <SelectContent>
                        {malls.map((mall) => (
                          <SelectItem key={mall} value={mall}>
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4" />
                              {mall}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700">
                    Assign to Mall
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-5 py-2 font-medium">
                  <Plus className="w-4 h-4 mr-2" />
                  Assign to Store
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Assign Supervisor to Store</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateAssignment} className="space-y-4">
                  <div>
                    <Label>Supervisor</Label>
                    <Select value={newAssignment.supervisor_id} onValueChange={(v) => setNewAssignment({...newAssignment, supervisor_id: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select supervisor" />
                      </SelectTrigger>
                      <SelectContent>
                        {supervisors.map((sup) => (
                          <SelectItem key={sup.user_id} value={sup.user_id}>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              {sup.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Store</Label>
                    <Select value={newAssignment.store_id} onValueChange={(v) => setNewAssignment({...newAssignment, store_id: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select store" />
                      </SelectTrigger>
                      <SelectContent>
                        {stores.map((store) => (
                          <SelectItem key={store.store_id} value={store.store_id}>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              {store.name} ({store.mall_name})
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                    Create Assignment
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-5 border border-slate-200 bg-white rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{supervisors.length}</p>
                <p className="text-sm text-slate-600">Supervisors</p>
              </div>
            </div>
          </Card>
          <Card className="p-5 border border-slate-200 bg-white rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <Building2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{malls.length}</p>
                <p className="text-sm text-slate-600">Malls</p>
              </div>
            </div>
          </Card>
          <Card className="p-5 border border-slate-200 bg-white rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 rounded-lg">
                <Store className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stores.length}</p>
                <p className="text-sm text-slate-600">Stores</p>
              </div>
            </div>
          </Card>
          <Card className="p-5 border border-slate-200 bg-white rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Plus className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{assignments.length}</p>
                <p className="text-sm text-slate-600">Store Assignments</p>
              </div>
            </div>
          </Card>
        </div>

        {/* All Supervisors List */}
        <Card className="p-6 border border-slate-200 bg-white rounded-xl">
          <h2 className="text-xl font-bold text-slate-900 mb-4">All Supervisors</h2>
          {supervisors.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No supervisors yet</h3>
              <p className="text-slate-600">Click "Add Supervisor" to create one</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {supervisors.map((sup) => (
                <div key={sup.user_id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{sup.name}</p>
                    <p className="text-sm text-slate-500">{sup.email}</p>
                    {sup.mall_name ? (
                      <p className="text-sm text-green-600 font-medium">Assigned to: {sup.mall_name}</p>
                    ) : (
                      <p className="text-sm text-amber-600 font-medium">Not assigned to any mall</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Mall Assignments */}
        <Card className="p-6 border border-slate-200 bg-white rounded-xl">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Supervisor Mall Assignments</h2>
          {supervisors.filter(s => s.mall_name).length === 0 ? (
            <p className="text-slate-500 text-center py-8">No supervisors assigned to malls yet</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {supervisors.filter(s => s.mall_name).map((sup) => (
                <div key={sup.user_id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{sup.name}</p>
                    <p className="text-sm text-slate-500">{sup.email}</p>
                    <p className="text-sm text-amber-600 font-medium">{sup.mall_name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        
        {/* Store Assignments */}
        <Card className="p-6 border border-slate-200 bg-white rounded-xl">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Supervisor Store Assignments</h2>
          {assignments.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No store assignments yet</h3>
              <p className="text-slate-600">Assign supervisors to stores to manage tasks</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignments.map((assn) => (
                <div key={assn.assignment_id} className="flex items-start justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-slate-900">{assn.supervisor_info?.name || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <MapPin className="w-4 h-4" />
                      <span>{assn.store_info?.name || 'Unknown Store'}</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Assigned: {new Date(assn.assigned_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleDeleteAssignment(assn.assignment_id)}
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </ManagerLayout>
  );
};

export default Assignments;
