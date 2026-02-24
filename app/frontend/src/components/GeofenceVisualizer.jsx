import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

const GeofenceVisualizer = ({ 
  stores = [], 
  userLocation = null, 
  onStoreClick,
  showUserLocation = true,
  className = "" 
}) => {
  const [animatedStores, setAnimatedStores] = useState([]);

  useEffect(() => {
    setAnimatedStores(stores.map((store, idx) => ({
      ...store,
      animationDelay: `${idx * 0.2}s`
    })));
  }, [stores]);

  const isUserInGeofence = (store) => {
    if (!userLocation || !store.latitude || !store.longitude) return null;
    const distance = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      store.latitude,
      store.longitude
    );
    return distance <= (store.radius || 100);
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  return (
    <div className={`relative w-full h-full bg-slate-100 rounded-xl overflow-hidden ${className}`}>
      {/* Map Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200">
        <div 
          className="absolute inset-0" 
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(0,0,0,0.03) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(0,0,0,0.03) 1px, transparent 1px)
            `,
            backgroundSize: '30px 30px'
          }}
        ></div>
      </div>

      {/* Stores with Geofence */}
      {animatedStores.map((store, idx) => {
        const position = {
          left: `${15 + (idx % 4) * 20}%`,
          top: `${20 + Math.floor(idx / 4) * 35}%`
        };
        
        const inGeofence = userLocation ? isUserInGeofence(store) : null;

        return (
          <div
            key={store.store_id}
            className="absolute cursor-pointer transition-transform hover:scale-105"
            style={{
              ...position,
              animationDelay: store.animationDelay
            }}
            onClick={() => onStoreClick?.(store)}
          >
            {/* Geofence Ring - Amber */}
            <div 
              className={`absolute w-32 h-32 -translate-x-1/2 -translate-y-1/2 rounded-full geofence-ring transition-opacity ${inGeofence === true ? 'opacity-100' : inGeofence === false ? 'opacity-50' : 'opacity-70'}`}
              style={{ 
                border: '2px dashed #f59e0b',
                animationDelay: store.animationDelay
              }}
            ></div>
            
            {/* Inner geofence ring */}
            <div 
              className="absolute w-20 h-20 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ 
                border: '1px solid rgba(245, 158, 11, 0.3)',
                backgroundColor: 'rgba(245, 158, 11, 0.05)'
              }}
            ></div>

            {/* Store Pin */}
            <div className="relative flex flex-col items-center">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-colors
                ${inGeofence === true ? 'bg-emerald-500' : inGeofence === false ? 'bg-red-500' : 'bg-primary'}
              `}>
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div className="mt-2 text-center">
                <span className="text-xs font-medium text-slate-800 bg-white/90 px-2 py-1 rounded shadow-sm block max-w-24 truncate">
                  {store.name}
                </span>
                {store.mall_name && (
                  <span className="text-xs text-slate-500 bg-white/90 px-1 rounded block mt-0.5">
                    {store.mall_name}
                  </span>
                )}
              </div>
            </div>

            {/* Status Indicator */}
            {inGeofence !== null && (
              <div className={`
                absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold
                ${inGeofence ? 'bg-emerald-500' : 'bg-red-500'}
              `}>
                {inGeofence ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              </div>
            )}
          </div>
        );
      })}

      {/* User Location */}
      {userLocation && showUserLocation && (
        <div className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 animate-bounce" style={{
          left: '50%',
          top: '50%'
        }}>
          <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
            <Navigation className="w-3 h-3 text-white" />
          </div>
          <div className="absolute w-12 h-12 -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2 rounded-full bg-blue-500/20"></div>
          <div className="absolute w-20 h-20 -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2 rounded-full bg-blue-500/10"></div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur rounded-lg p-3 text-xs shadow-sm">
        <p className="font-semibold text-slate-700 mb-2">Legend</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary"></div>
            <span className="text-slate-600">Store</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full border-2 border-amber-500"></div>
            <span className="text-slate-600">Geofence (100m)</span>
          </div>
          {userLocation && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-600"></div>
              <span className="text-slate-600">Your Location</span>
            </div>
          )}
        </div>
      </div>

      {/* No stores message */}
      {stores.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 font-body">No stores to display</p>
            <p className="text-xs text-slate-400 font-body">Add stores to see them on the map</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeofenceVisualizer;
