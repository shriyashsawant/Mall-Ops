import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import ManagerLayout from '../../components/ManagerLayout';
import { Trash2, Building2, MapPin, Plus, Slider } from 'lucide-react';
import { toast } from 'sonner';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const STORE_NAMES = [
  "Reliance Trends", "Reliance Digital", "Smart Bazaar", "Mall Management",
  "Smart Point", "Reliance FootPrint", "Reliance Fresh"
];

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
const API = `${BACKEND_URL}/api`;

const MapClickHandler = ({ onMapClick }) => {
  useMapEvents({ click: (e) => onMapClick(e.latlng.lat, e.latlng.lng) });
  return null;
};

const Stores = ({ user }) => {
  const [malls, setMalls] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMall, setSelectedMall] = useState(null);
  const [formMode, setFormMode] = useState(null);
  const [formData, setFormData] = useState({
    name: '', city: 'Pune', state: 'Maharashtra', address: '',
    latitude: '', longitude: '',
    store_name: '', store_code: '', lat: '', lng: '', radius: 100,
    selectedStores: []
  });
  
  useEffect(() => { loadData(); }, []);
  
  const loadData = async () => {
    try {
      const res = await axios.get(`${API}/malls`, { withCredentials: true });
      setMalls(res.data);
      if (res.data.length > 0) {
        setSelectedMall(res.data[0]);
        loadStores(res.data[0].mall_id);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };
  
  const loadStores = async (mallId) => {
    try {
      const res = await axios.get(`${API}/stores?mall_id=${mallId}`, { withCredentials: true });
      setStores(res.data);
    } catch (err) { console.error(err); }
  };
  
  const handleMallSubmit = async (e) => {
    e.preventDefault();
    try {
      // Create mall first
      const mallRes = await axios.post(`${API}/malls`, {
        name: formData.name, city: formData.city, state: formData.state,
        address: formData.address,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null
      }, { withCredentials: true });
      
      const mallId = mallRes.data.mall_id;
      
      // Create stores for this mall
      for (const storeName of formData.selectedStores) {
        await axios.post(`${API}/stores`, {
          name: storeName,
          mall_id: mallId,
          store_code: STORE_NAMES.indexOf(storeName) + 101,
          latitude: formData.latitude ? parseFloat(formData.latitude) + (Math.random() - 0.5) * 0.001 : null,
          longitude: formData.longitude ? parseFloat(formData.longitude) + (Math.random() - 0.5) * 0.001 : null,
          radius: 100
        }, { withCredentials: true });
      }
      
      toast.success('Mall and stores created successfully');
      setFormMode(null);
      setFormData({ name: '', city: 'Pune', state: 'Maharashtra', address: '', latitude: '', longitude: '', store_name: '', store_code: '', lat: '', lng: '', radius: 100, selectedStores: [] });
      loadData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to create mall'); }
  };
  
  const handleStoreSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMall) { toast.error('Please select a mall first'); return; }
    try {
      await axios.post(`${API}/stores`, {
        name: formData.store_name, mall_id: selectedMall.mall_id,
        store_code: formData.store_code ? parseInt(formData.store_code) : null,
        latitude: formData.lat ? parseFloat(formData.lat) : null,
        longitude: formData.lng ? parseFloat(formData.lng) : null,
        radius: parseInt(formData.radius)
      }, { withCredentials: true });
      toast.success('Store created successfully');
      setFormMode(null);
      setFormData({ name: '', city: 'Pune', state: 'Maharashtra', address: '', latitude: '', longitude: '', store_name: '', store_code: '', lat: '', lng: '', radius: 100 });
      loadStores(selectedMall.mall_id);
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to create store'); }
  };
  
  const resetForm = () => {
    setFormMode(null);
    setFormData({ name: '', city: 'Pune', state: 'Maharashtra', address: '', latitude: '', longitude: '', store_name: '', store_code: '', lat: '', lng: '', radius: 100, selectedStores: [] });
  };
  
  const handleDeleteMall = async (mallId) => {
    if (!window.confirm('Delete this mall and all its stores?')) return;
    try {
      await axios.delete(`${API}/malls/${mallId}`, { withCredentials: true });
      toast.success('Mall deleted');
      loadData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to delete'); }
  };
  
  const handleDeleteStore = async (storeId) => {
    if (!window.confirm('Delete this store?')) return;
    try {
      await axios.delete(`${API}/stores/${storeId}`, { withCredentials: true });
      toast.success('Store deleted');
      if (selectedMall) loadStores(selectedMall.mall_id);
    } catch (err) { toast.error('Failed to delete store'); }
  };

  const handleMapClick = (lat, lng, isMall) => {
    if (isMall) {
      setFormData({ ...formData, latitude: lat.toFixed(6), longitude: lng.toFixed(6) });
    } else {
      setFormData({ ...formData, lat: lat.toFixed(6), lng: lng.toFixed(6) });
    }
  };

  if (loading) {
    return (
      <ManagerLayout user={user}>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </ManagerLayout>
    );
  }
  
  return (
    <ManagerLayout user={user}>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Malls & Stores</h1>
            <p className="text-gray-500 mt-1">Manage malls, stores with geofence locations</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => setFormMode(formMode === 'mall' ? null : 'mall')} 
              variant={formMode === 'mall' ? 'secondary' : 'default'} className="bg-green-600 hover:bg-green-700">
               <Plus className="w-4 h-4 mr-2" />{formMode === 'mall' ? 'Cancel' : 'Add Mall'}
            </Button>
            {malls.length > 0 && (
              <Button onClick={() => { 
                setFormMode('store'); 
                // Set store defaults from selected mall
                if (selectedMall) {
                  setFormData(prev => ({
                    ...prev,
                    lat: selectedMall.latitude?.toString() || '',
                    lng: selectedMall.longitude?.toString() || ''
                  }));
                }
              }} 
                variant={formMode === 'store' ? 'secondary' : 'default'} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />{formMode === 'store' ? 'Cancel' : 'Add Store'}
              </Button>
            )}
          </div>
        </div>

        {/* Mall Form with Map */}
        {formMode === 'mall' && (
          <Card className="mb-6 p-6 border-green-200 bg-green-50">
            <h2 className="text-xl font-semibold mb-4 text-green-800">Create New Mall</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-green-700">Mall Name *</Label>
                  <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Phoenix Marketcity" required className="bg-white" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-green-700">City *</Label>
                    <Input value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} required className="bg-white" />
                  </div>
                  <div>
                    <Label className="text-green-700">State *</Label>
                    <Input value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} required className="bg-white" />
                  </div>
                </div>
                <div>
                  <Label className="text-green-700">Address</Label>
                  <Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Full address" className="bg-white" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-green-700">Latitude</Label>
                    <Input value={formData.latitude} onChange={e => setFormData({...formData, latitude: e.target.value})} placeholder="Click map to set" className="bg-white" />
                  </div>
                  <div>
                    <Label className="text-green-700">Longitude</Label>
                    <Input value={formData.longitude} onChange={e => setFormData({...formData, longitude: e.target.value})} placeholder="Click map to set" className="bg-white" />
                  </div>
                </div>
                
                {/* Store Selection */}
                <div>
                  <Label className="text-green-700 mb-2 block">Select Stores for this Mall *</Label>
                  <p className="text-xs text-green-600 mb-2">Choose which company stores are in this mall</p>
                  <div className="grid grid-cols-2 gap-2 bg-white p-3 rounded-lg border max-h-40 overflow-y-auto">
                    {STORE_NAMES.map(store => (
                      <label key={store} className="flex items-center gap-2 cursor-pointer hover:bg-green-50 p-2 rounded">
                        <input 
                          type="checkbox" 
                          checked={formData.selectedStores.includes(store)}
                          onChange={e => {
                            if (e.target.checked) {
                              setFormData({...formData, selectedStores: [...formData.selectedStores, store]});
                            } else {
                              setFormData({...formData, selectedStores: formData.selectedStores.filter(s => s !== store)});
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">{store}</span>
                      </label>
                    ))}
                  </div>
                  {formData.selectedStores.length === 0 && (
                    <p className="text-xs text-red-500 mt-1">Please select at least one store</p>
                  )}
                </div>
                
                <Button onClick={handleMallSubmit} className="bg-green-600 hover:bg-green-700 w-full" disabled={formData.selectedStores.length === 0}>Create Mall</Button>
              </div>
              <div>
                <Label className="text-green-700 mb-2 block">Click on map to set location</Label>
                <div className="h-80 rounded-lg overflow-hidden border">
                  <MapContainer center={[18.5362, 73.9115]} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="OpenStreetMap" />
                    {formData.latitude && formData.longitude && (
                      <>
                        <Marker position={[parseFloat(formData.latitude), parseFloat(formData.longitude)]} />
                        <Circle center={[parseFloat(formData.latitude), parseFloat(formData.longitude)]} radius={200} pathOptions={{ color: 'green', fillColor: 'green', fillOpacity: 0.2 }} />
                      </>
                    )}
                    <MapClickHandler onMapClick={(lat, lng) => handleMapClick(lat, lng, true)} />
                  </MapContainer>
                </div>
                <p className="text-xs text-gray-500 mt-1">Green circle shows 200m geofence area</p>
              </div>
            </div>
          </Card>
        )}

        {/* Store Form with Map */}
        {formMode === 'store' && selectedMall && (
          <Card className="mb-6 p-6 border-blue-200 bg-blue-50">
            <h2 className="text-xl font-semibold mb-4 text-blue-800">Add Store to {selectedMall.name}</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-blue-700">Store Name *</Label>
                  <select 
                    value={formData.store_name} 
                    onChange={e => setFormData({...formData, store_name: e.target.value})}
                    className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white"
                  >
                    <option value="">Select store</option>
                    {STORE_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-blue-700">Store Code *</Label>
                    <Input type="number" value={formData.store_code} onChange={e => setFormData({...formData, store_code: e.target.value})} placeholder="101" required className="bg-white" />
                  </div>
                  <div>
                    <Label className="text-blue-700">Geofence Radius (m)</Label>
                    <Input type="number" value={formData.radius} onChange={e => setFormData({...formData, radius: e.target.value})} className="bg-white" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-blue-700">Latitude</Label>
                    <Input value={formData.lat} onChange={e => setFormData({...formData, lat: e.target.value})} placeholder="Click map" className="bg-white" />
                  </div>
                  <div>
                    <Label className="text-blue-700">Longitude</Label>
                    <Input value={formData.lng} onChange={e => setFormData({...formData, lng: e.target.value})} placeholder="Click map" className="bg-white" />
                  </div>
                </div>
                <Button onClick={handleStoreSubmit} className="bg-blue-600 hover:bg-blue-700 w-full">Add Store</Button>
              </div>
              <div>
                <Label className="text-blue-700 mb-2 block">Click on map to set store location</Label>
                <div className="h-80 rounded-lg overflow-hidden border">
                  <MapContainer 
                    center={selectedMall.latitude ? [selectedMall.latitude, selectedMall.longitude] : [18.5362, 73.9115]} 
                    zoom={selectedMall.latitude ? 16 : 13} 
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="OpenStreetMap" />
                    {selectedMall.latitude && (
                      <Circle center={[selectedMall.latitude, selectedMall.longitude]} radius={200} pathOptions={{ color: 'gray', fillColor: 'gray', fillOpacity: 0.1 }} />
                    )}
                    {formData.lat && formData.lng && (
                      <>
                        <Marker position={[parseFloat(formData.lat), parseFloat(formData.lng)]} />
                        <Circle center={[parseFloat(formData.lat), parseFloat(formData.lng)]} radius={parseInt(formData.radius)} pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.2 }} />
                      </>
                    )}
                    <MapClickHandler onMapClick={(lat, lng) => handleMapClick(lat, lng, false)} />
                  </MapContainer>
                </div>
                <p className="text-xs text-gray-500 mt-1">Blue circle shows {formData.radius}m geofence area</p>
              </div>
            </div>
          </Card>
        )}

        {/* Empty State */}
        {malls.length === 0 && !formMode ? (
          <Card className="p-12 text-center">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Malls Yet</h3>
            <p className="text-gray-500 mb-6">Add your first mall with location to get started</p>
            <Button onClick={() => setFormMode('mall')} className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />Add First Mall
            </Button>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Mall Tabs */}
            {malls.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {malls.map(mall => (
                  <button
                    key={mall.mall_id}
                    onClick={() => { setSelectedMall(mall); loadStores(mall.mall_id); }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                      selectedMall?.mall_id === mall.mall_id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    <span className="font-medium">{mall.name}</span>
                    <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">{mall.store_count}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Selected Mall */}
            {selectedMall && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedMall.name}</h2>
                    <p className="text-gray-500">{selectedMall.address || `${selectedMall.city}, ${selectedMall.state}`}</p>
                    {selectedMall.latitude && (
                      <p className="text-sm text-gray-400 flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" /> {selectedMall.latitude?.toFixed(4)}, {selectedMall.longitude?.toFixed(4)}
                      </p>
                    )}
                  </div>
                  <Button variant="outline" onClick={() => handleDeleteMall(selectedMall.mall_id)} className="text-red-600 border-red-200 hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stores.map(store => (
                    <div key={store.store_id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-gray-900">{store.name}</h4>
                          {store.store_code && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Code: {store.store_code}</span>}
                        </div>
                        <button onClick={() => handleDeleteStore(store.store_id)} className="text-red-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">📍 {store.radius}m</span>
                        {store.location?.lat && <span className="text-xs text-gray-400">{store.location.lat.toFixed(4)}, {store.location.lng.toFixed(4)}</span>}
                      </div>
                    </div>
                  ))}
                  {stores.length === 0 && <p className="text-gray-400 col-span-3 text-center py-8">No stores in this mall yet</p>}
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </ManagerLayout>
  );
};

export default Stores;
