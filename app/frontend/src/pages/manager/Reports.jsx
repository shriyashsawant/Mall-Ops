import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import ManagerLayout from '../../components/ManagerLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { MapPin, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Stores = ({ user }) => {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newStore, setNewStore] = useState({
    name: '',
    lat: '',
    lng: '',
    radius: 100
  });
  
  useEffect(() => {
    fetchStores();
  }, []);
  
  const fetchStores = async () => {
    try {
      const response = await axios.get(`${API}/stores`, {
        withCredentials: true
      });
      setStores(response.data);
    } catch (error) {
      console.error('Failed to fetch stores:', error);
      toast.error('Failed to load stores');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCreateStore = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/stores`, {
        name: newStore.name,
        location: {
          lat: parseFloat(newStore.lat),
          lng: parseFloat(newStore.lng)
        },
        radius: parseInt(newStore.radius)
      }, {
        withCredentials: true
      });
      
      toast.success('Store created successfully');
      setIsDialogOpen(false);
      setNewStore({ name: '', lat: '', lng: '', radius: 100 });
      fetchStores();
    } catch (error) {
      console.error('Failed to create store:', error);
      toast.error('Failed to create store');
    }
  };
  
  const handleDeleteStore = async (storeId) => {
    if (!window.confirm('Are you sure you want to delete this store?')) return;
    
    try {
      await axios.delete(`${API}/stores/${storeId}`, {
        withCredentials: true
      });
      toast.success('Store deleted successfully');
      fetchStores();
    } catch (error) {
      console.error('Failed to delete store:', error);
      toast.error('Failed to delete store');
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
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2" data-testid="stores-title">
              Store Locations
            </h1>
            <p className="text-slate-600">Manage geofenced store locations</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-store-btn" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-6 py-2.5 font-medium transition-all active:scale-95">
                <Plus className="w-4 h-4 mr-2" />
                Add Store
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Store</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateStore} className="space-y-4">
                <div>
                  <Label htmlFor="name">Store Name</Label>
                  <Input
                    id="name"
                    data-testid="store-name-input"
                    value={newStore.name}
                    onChange={(e) => setNewStore({...newStore, name: e.target.value})}
                    placeholder="Store A - North Wing"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="lat">Latitude</Label>
                    <Input
                      id="lat"
                      data-testid="store-lat-input"
                      type="number"
                      step="any"
                      value={newStore.lat}
                      onChange={(e) => setNewStore({...newStore, lat: e.target.value})}
                      placeholder="40.7128"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lng">Longitude</Label>
                    <Input
                      id="lng"
                      data-testid="store-lng-input"
                      type="number"
                      step="any"
                      value={newStore.lng}
                      onChange={(e) => setNewStore({...newStore, lng: e.target.value})}
                      placeholder="-74.0060"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="radius">Geofence Radius (meters)</Label>
                  <Input
                    id="radius"
                    data-testid="store-radius-input"
                    type="number"
                    value={newStore.radius}
                    onChange={(e) => setNewStore({...newStore, radius: e.target.value})}
                    required
                  />
                </div>
                <Button type="submit" data-testid="create-store-submit" className="w-full bg-blue-600 hover:bg-blue-700">
                  Create Store
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Stores Grid */}
        {stores.length === 0 ? (
          <Card className="p-12 text-center border border-dashed border-slate-300">
            <MapPin className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No stores yet</h3>
            <p className="text-slate-600 mb-6">Create your first store location to get started</p>
            <Button onClick={() => setIsDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Store
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="stores-grid">
            {stores.map((store) => (
              <Card key={store.store_id} className="p-6 border border-slate-200 bg-white rounded-xl shadow-sm hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-amber-100 rounded-lg">
                    <MapPin className="w-6 h-6 text-amber-600" />
                  </div>
                  <Button
                    onClick={() => handleDeleteStore(store.store_id)}
                    data-testid={`delete-store-${store.store_id}`}
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2" data-testid={`store-name-${store.store_id}`}>{store.name}</h3>
                <div className="space-y-2 text-sm text-slate-600">
                  <p><span className="font-medium">Lat:</span> {store.location.lat.toFixed(6)}</p>
                  <p><span className="font-medium">Lng:</span> {store.location.lng.toFixed(6)}</p>
                  <p><span className="font-medium">Radius:</span> {store.radius}m</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ManagerLayout>
  );
};

export default Stores;
