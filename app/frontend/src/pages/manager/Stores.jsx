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

const COMMON_STORE_NAMES = [
  "Reliance Trends", "Reliance Digital", "Smart Bazaar", "Mall Management",
  "Smart Point", "Reliance FootPrint", "Reliance Fresh", "AJIO", "Netmeds", "Urban Ladder"
];

const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL || "http://localhost:8000").replace(/\/+$/, "");
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
  const [customStoreInput, setCustomStoreInput] = useState('');
  const [formData, setFormData] = useState({
    name: '', city: 'Pune', state: 'Maharashtra', address: '',
    latitude: '', longitude: '',
    store_name: '', store_code: '', lat: '', lng: '', radius: 100,
    selectedStores: []
  });
  
  useEffect(() => { loadData(); }, []);
  
  const loadData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/malls`, { withCredentials: true });
      setMalls(res.data);
      if (res.data.length > 0) {
        // Find if previous selected mall still exists, or default to first
        const currentMall = selectedMall ? res.data.find(m => m.mall_id === selectedMall.mall_id) : res.data[0];
        const mallToSelect = currentMall || res.data[0];
        setSelectedMall(mallToSelect);
        loadStores(mallToSelect.mall_id);
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
    if (!formData.name) { toast.error('Mall name is required'); return; }
    
    try {
      // Create mall first
      const mallRes = await axios.post(`${API}/malls`, {
        name: formData.name, city: formData.city, state: formData.state,
        address: formData.address,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null
      }, { withCredentials: true });
      
      const mallId = mallRes.data.mall_id;
      
      // Create stores for this mall if any selected
      if (formData.selectedStores.length > 0) {
        toast.info(`Creating mall... now adding ${formData.selectedStores.length} stores`);
        for (let i = 0; i < formData.selectedStores.length; i++) {
          const storeName = formData.selectedStores[i];
          await axios.post(`${API}/stores`, {
            name: storeName,
            mall_id: mallId,
            store_code: 1000 + (Math.floor(Math.random() * 9000)),
            latitude: formData.latitude ? parseFloat(formData.latitude) + (Math.random() - 0.5) * 0.001 : null,
            longitude: formData.longitude ? parseFloat(formData.longitude) + (Math.random() - 0.5) * 0.001 : null,
            radius: 100
          }, { withCredentials: true });
        }
      }
      
      toast.success('Mall created successfully');
      resetForm();
      loadData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to create mall'); }
  };
  
  const handleStoreSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMall) { toast.error('Please select a mall first'); return; }
    if (!formData.store_name) { toast.error('Store name is required'); return; }
    
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
      setFormData({ ...formData, store_name: '', store_code: '', lat: '', lng: '', radius: 100 });
      loadStores(selectedMall.mall_id);
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to create store'); }
  };
  
  const resetForm = () => {
    setFormMode(null);
    setCustomStoreInput('');
    setFormData({ name: '', city: 'Pune', state: 'Maharashtra', address: '', latitude: '', longitude: '', store_name: '', store_code: '', lat: '', lng: '', radius: 100, selectedStores: [] });
  };
  
  const handleDeleteMall = async (mallId) => {
    if (!window.confirm('Delete this mall? (Note: All stores must be deleted first)')) return;
    try {
      await axios.delete(`${API}/malls/${mallId}`, { withCredentials: true });
      toast.success('Mall deleted');
      loadData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to delete mall. Ensure all stores are deleted first.'); }
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

  const addCustomStore = () => {
    if (!customStoreInput.trim()) return;
    if (formData.selectedStores.includes(customStoreInput.trim())) {
      setCustomStoreInput('');
      return;
    }
    setFormData({
      ...formData,
      selectedStores: [...formData.selectedStores, customStoreInput.trim()]
    });
    setCustomStoreInput('');
  };

  if (loading && malls.length === 0) {
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
            <p className="text-gray-500 mt-1">Manage infrastructure and geofence locations</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => setFormMode(formMode === 'mall' ? null : 'mall')} 
              variant={formMode === 'mall' ? 'secondary' : 'default'} className="bg-green-600 hover:bg-green-700">
               <Plus className="w-4 h-4 mr-2" />{formMode === 'mall' ? 'Cancel' : 'Add Mall'}
            </Button>
            {malls.length > 0 && (
              <Button onClick={() => { 
                setFormMode('store'); 
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

        {/* Mall Form */}
        {formMode === 'mall' && (
          <Card className="mb-6 p-6 border-green-200 bg-green-50 shadow-lg">
            <h2 className="text-xl font-bold mb-4 text-green-800 flex items-center gap-2">
              <Building2 className="w-5 h-5" /> Create New Mall
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label className="text-green-700 font-semibold">Mall Name *</Label>
                    <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Phoenix Mall of the Millennium" required className="bg-white" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-green-700 font-semibold">City *</Label>
                    <Input value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} required className="bg-white" />
                  </div>
                  <div>
                    <Label className="text-green-700 font-semibold">State *</Label>
                    <Input value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} required className="bg-white" />
                  </div>
                </div>
                <div>
                  <Label className="text-green-700 font-semibold">Address</Label>
                  <Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Full address" className="bg-white" />
                </div>
                
                {/* Store Creation during Mall Add */}
                <div className="p-4 bg-white rounded-lg border border-green-100">
                  <Label className="text-green-700 font-bold mb-2 block">Initial Stores</Label>
                  <div className="flex gap-2 mb-3">
                    <Input 
                        placeholder="Type store name (e.g. Starbucks)" 
                        value={customStoreInput}
                        onChange={e => setCustomStoreInput(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addCustomStore())}
                    />
                    <Button type="button" onClick={addCustomStore} size="sm" className="bg-green-600">Add</Button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    {formData.selectedStores.map(store => (
                      <span key={store} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                        {store}
                        <X className="w-3 h-3 cursor-pointer" onClick={() => setFormData({...formData, selectedStores: formData.selectedStores.filter(s => s !== store)})} />
                      </span>
                    ))}
                  </div>

                  <p className="text-[10px] text-gray-400 mb-2 uppercase tracking-wider font-bold">Suggested Brands</p>
                  <div className="flex flex-wrap gap-1">
                    {COMMON_STORE_NAMES.map(store => (
                      <button 
                        key={store}
                        type="button"
                        onClick={() => {
                            if (!formData.selectedStores.includes(store)) {
                                setFormData({...formData, selectedStores: [...formData.selectedStores, store]});
                            }
                        }}
                        className={`text-xs px-2 py-1 rounded border ${formData.selectedStores.includes(store) ? 'bg-green-600 text-white border-green-600' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                      >
                        {store}
                      </button>
                    ))}
                  </div>
                </div>
                
                <Button onClick={handleMallSubmit} className="bg-green-600 hover:bg-green-700 w-full h-12 font-bold text-lg shadow-md">Create Mall & Stores</Button>
              </div>
              
              <div>
                <Label className="text-green-700 font-semibold mb-2 block">Geofence Center Point</Label>
                <div className="h-[400px] rounded-lg overflow-hidden border shadow-inner">
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
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <Input value={formData.latitude} onChange={e => setFormData({...formData, latitude: e.target.value})} placeholder="Lat" className="bg-white text-xs" />
                  <Input value={formData.longitude} onChange={e => setFormData({...formData, longitude: e.target.value})} placeholder="Lng" className="bg-white text-xs" />
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Store Form */}
        {formMode === 'store' && selectedMall && (
          <Card className="mb-6 p-6 border-blue-200 bg-blue-50 shadow-lg">
            <h2 className="text-xl font-bold mb-4 text-blue-800 flex items-center gap-2">
              <Store className="w-5 h-5" /> Add Store to {selectedMall.name}
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <Label className="text-blue-700 font-semibold">Store Name *</Label>
                  <Input 
                    value={formData.store_name} 
                    onChange={e => setFormData({...formData, store_name: e.target.value})} 
                    placeholder="e.g. Apple Store, Zara, etc." 
                    className="bg-white"
                  />
                  <div className="mt-2 flex flex-wrap gap-1">
                    {COMMON_STORE_NAMES.slice(0, 6).map(n => (
                      <button 
                        key={n}
                        type="button"
                        onClick={() => setFormData({...formData, store_name: n})}
                        className="text-[10px] px-2 py-0.5 rounded-full border border-blue-200 bg-white text-blue-600 hover:bg-blue-50"
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-blue-700 font-semibold">Store Identifier / Code</Label>
                    <Input type="number" value={formData.store_code} onChange={e => setFormData({...formData, store_code: e.target.value})} placeholder="e.g. 5002" className="bg-white" />
                  </div>
                  <div>
                    <Label className="text-blue-700 font-semibold">Geofence Radius (m)</Label>
                    <Input type="number" value={formData.radius} onChange={e => setFormData({...formData, radius: e.target.value})} className="bg-white" />
                  </div>
                </div>
                <Button onClick={handleStoreSubmit} className="bg-blue-600 hover:bg-blue-700 w-full h-12 font-bold text-lg shadow-md">Add Store</Button>
              </div>
              <div>
                <Label className="text-blue-700 font-semibold mb-2 block">Set Store Specific Location</Label>
                <div className="h-[300px] rounded-lg overflow-hidden border shadow-inner">
                  <MapContainer 
                    center={selectedMall.latitude ? [selectedMall.latitude, selectedMall.longitude] : [18.5362, 73.9115]} 
                    zoom={selectedMall.latitude ? 17 : 13} 
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="OpenStreetMap" />
                    {selectedMall.latitude && (
                      <Circle center={[selectedMall.latitude, selectedMall.longitude]} radius={200} pathOptions={{ color: 'gray', fillColor: 'gray', fillOpacity: 0.1, dashArray: '5, 10' }} />
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
                <p className="text-[10px] text-gray-500 mt-2 italic text-center">Click map to adjust geofence for this specific store (Optional)</p>
              </div>
            </div>
          </Card>
        )}

        {/* Mall Overview Content */}
        {malls.length === 0 && !formMode ? (
          <div className="bg-white p-12 rounded-xl border-2 border-dashed border-gray-200 text-center">
            <Building2 className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Malls Registered</h3>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">Start by adding a mall and its stores. You'll be able to set geofences for each store to track supervisor attendance.</p>
            <Button onClick={() => setFormMode('mall')} className="bg-green-600 hover:bg-green-700 h-11 px-8">
              <Plus className="w-4 h-4 mr-2" />Add Your First Mall
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Mall Navigation Bar */}
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {malls.map(mall => (
                <button
                  key={mall.mall_id}
                  onClick={() => { setSelectedMall(mall); loadStores(mall.mall_id); }}
                  className={`flex flex-col items-start px-5 py-3 rounded-xl border-2 transition-all min-w-[200px] text-left ${
                    selectedMall?.mall_id === mall.mall_id ? 'border-blue-500 bg-blue-50 text-blue-800 shadow-sm' : 'border-white bg-white hover:border-gray-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <Building2 className={`w-5 h-5 ${selectedMall?.mall_id === mall.mall_id ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">
                      {mall.store_count} Stores
                    </span>
                  </div>
                  <span className="font-bold text-sm truncate w-full">{mall.name}</span>
                  <span className="text-[10px] text-gray-400 font-medium">{mall.city}</span>
                </button>
              ))}
            </div>

            {/* Selected Mall Drill-down */}
            {selectedMall && (
              <Card className="overflow-hidden border-none shadow-xl bg-white">
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                        <Building2 className="w-8 h-8 text-blue-400" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black">{selectedMall.name}</h2>
                        <div className="flex items-center gap-3 text-sm text-slate-300 mt-1">
                           <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {selectedMall.city}, {selectedMall.state}</span>
                           <span className="h-1 w-1 bg-slate-500 rounded-full"></span>
                           <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-bold text-[10px] uppercase">GEOFENCE ACTIVE</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                        <Button 
                            variant="ghost" 
                            className="text-slate-400 hover:text-white hover:bg-white/10 h-10 w-10 p-0"
                            title="Delete Mall"
                            onClick={() => handleDeleteMall(selectedMall.mall_id)}
                        >
                            <Trash2 className="w-5 h-5" />
                        </Button>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-slate-800 uppercase tracking-widest text-[11px]">Stores List</h3>
                    <div className="text-[11px] text-slate-400 font-bold">{stores.length} TOTAL UNITS</div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {stores.map(store => (
                      <div key={store.store_id} className="group relative bg-slate-50 border border-slate-100 p-5 rounded-2xl hover:bg-white hover:shadow-xl transition-all hover:-translate-y-1">
                        <div className="flex justify-between items-start mb-3">
                          <div className="h-10 w-10 bg-white rounded-xl shadow-sm flex items-center justify-center">
                            <Store className="w-5 h-5 text-blue-500" />
                          </div>
                          <button 
                            onClick={() => handleDeleteStore(store.store_id)} 
                            className="bg-red-50 text-red-400 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <h4 className="font-bold text-slate-800 leading-tight mb-2 h-10 line-clamp-2">{store.name}</h4>
                        
                        <div className="flex flex-wrap gap-2 mt-auto">
                          <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded tracking-tighter">#{store.store_code || 'N/A'}</span>
                          <span className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded tracking-tighter">{store.radius}M RADIUS</span>
                        </div>
                      </div>
                    ))}
                    
                    {/* Inline Add Button Case */}
                    <button 
                      onClick={() => setFormMode('store')}
                      className="border-2 border-dashed border-slate-200 p-5 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors gap-2 min-h-[160px]"
                    >
                      <Plus className="w-6 h-6" />
                      <span className="text-xs font-bold uppercase tracking-wider">Add Unit</span>
                    </button>
                  </div>
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



