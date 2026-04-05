import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's default icon missing issue
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetina,
  iconUrl: iconUrl,
  shadowUrl: shadowUrl,
});

// Custom Icons
const userIcon = new L.Icon({
  ...L.Icon.Default.prototype.options,
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const hospitalIcon = new L.Icon({
  ...L.Icon.Default.prototype.options,
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const pharmacyIcon = new L.Icon({
  ...L.Icon.Default.prototype.options,
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});


// Raw Leaflet Map Component wrapper
function LeafletMap({ userLoc, locationGranted, hospitals, mapInstanceRef }) {
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (!mapInstanceRef.current && mapRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView([userLoc.lat, userLoc.lng], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current);
    }

    if (mapInstanceRef.current) {
      // Clear old markers
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];

      // Add user location
      if (locationGranted) {
        const uMarker = L.marker([userLoc.lat, userLoc.lng], { icon: userIcon })
          .addTo(mapInstanceRef.current)
          .bindPopup('<strong>You are here</strong>');
        markersRef.current.push(uMarker);
      }

      // Add hospitals
      hospitals.forEach(h => {
        if (h.lat && h.lng) {
          const m = L.marker([h.lat, h.lng], { icon: h.type === 'pharmacy' ? pharmacyIcon : hospitalIcon })
            .addTo(mapInstanceRef.current)
            .bindPopup(`<strong>${h.name}</strong><br/>Type: ${h.type}<br/>${h.distance} km away`);
          markersRef.current.push(m);
        }
      });
      
      // Optionally fit bounds if there are hospitals
      if (hospitals.length > 0) {
          const group = new L.featureGroup(markersRef.current);
          mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1));
      } else {
        mapInstanceRef.current.setView([userLoc.lat, userLoc.lng], 13);
      }
    }
  }, [userLoc, locationGranted, hospitals, mapInstanceRef]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={mapRef} style={{ height: '100%', width: '100%', zIndex: 1 }} />;
}

// Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return (R * c).toFixed(2);
}

export default function Hospitals() {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Geolocation states
  const [locationGranted, setLocationGranted] = useState(false); 
  const [userLoc, setUserLoc] = useState({ lat: 28.6139, lng: 77.2090 }); // Default
  const [statusMsg, setStatusMsg] = useState('Requesting location permission...');
  
  const mapInstanceRef = useRef(null);

  // Auto-fetch location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setUserLoc({ lat, lng });
          setLocationGranted(true);
          fetchHospitalsFromOverpass(lat, lng, 10000);
        },
        (error) => {
          console.error("Location error:", error);
          setStatusMsg('Location permission was denied or failed.');
          setLocationGranted(false);
          setLoading(false);
        }
      );
    } else {
      setStatusMsg('Geolocation not supported by this browser.');
      setLocationGranted(false);
      setLoading(false);
    }
  }, []);

  const fetchHospitalsFromOverpass = async (lat, lon, fetchRadius) => {
    setLoading(true);
    setStatusMsg('Scanning OpenStreetMap for nearby facilities (10km)...');
    setHospitals([]);
    
    try {
      let query = `[out:json];(`;
      query += `
        node["amenity"="hospital"](around:${fetchRadius}, ${lat}, ${lon});
        way["amenity"="hospital"](around:${fetchRadius}, ${lat}, ${lon});
        relation["amenity"="hospital"](around:${fetchRadius}, ${lat}, ${lon});
      `;
      query += `); out center;`;
      
      const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
      const response = await fetch(url);
      
      if (!response.ok) throw new Error("OpenStreetMap API is busy. Try again.");
      
      const data = await response.json();
      
      const results = data.elements.map(el => {
        const elLat = el.lat || el.center?.lat;
        const elLon = el.lon || el.center?.lon;
        const typeTag = el.tags?.amenity || 'hospital';
        const name = el.tags?.name || (typeTag === 'pharmacy' ? 'Pharmacy' : 'Hospital');
        
        return {
            id: el.id,
            name: name,
            type: typeTag,
            lat: elLat,
            lng: elLon,
            distance: parseFloat(calculateDistance(lat, lon, elLat, elLon))
        };
      }).filter(h => h.lat && h.lng);

      // Sort by closest distance
      results.sort((a, b) => a.distance - b.distance);
      
      setHospitals(results);
      if(results.length === 0) setStatusMsg('No facilities found in this radius.');
      else setStatusMsg('');

    } catch (err) {
      console.error(err);
      setStatusMsg("Error fetching facilities: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper container" style={{ paddingBottom: '60px', maxWidth: '1200px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
            <h2 style={{ marginBottom: '8px' }}>🏥 Nearby Hospitals</h2>
            <p style={{ color: 'var(--text-muted)' }}>
            Real-time querying via OpenStreetMap Overpass API within a 10km radius.
            </p>
        </div>
      </div>


      {/* Main Grid View */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 1fr) minmax(350px, 1fr)', gap: '24px', alignItems: 'flex-start' }}>
        
        {/* Left Column: List */}
        <div>
          {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div className="spinner" style={{ margin: '0 auto 12px auto' }} />
                  <p>{statusMsg}</p>
              </div>
          ) : !locationGranted && hospitals.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-light)', borderRadius: '12px' }}>
                <p>{statusMsg}</p>
              </div>
          ) : statusMsg && hospitals.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--danger)', background: 'var(--bg-light)', borderRadius: '12px' }}>
                  <p>{statusMsg}</p>
              </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', height: '600px', overflowY: 'auto', paddingRight: '10px' }} className="hide-scroll">
              <div style={{ marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Found {hospitals.length} facilities within 10km
              </div>
              {hospitals.map(h => (
                <div key={h.id} className="glass-card hospital-card" onClick={() => {
                   if(mapInstanceRef.current) mapInstanceRef.current.setView([h.lat, h.lng], 16);
                }} style={{ padding: '22px 24px', display: 'flex', gap: '20px', alignItems: 'flex-start', cursor: 'pointer' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '10px', background: 'linear-gradient(135deg, #e0eaf5, #c7d9f5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>
                    {h.type === 'pharmacy' ? '💊' : '🏥'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px', marginBottom: '6px' }}>
                      <h4 style={{ fontSize: '1rem', margin: 0, color: 'var(--primary)' }}>{h.name}</h4>
                    </div>
                    
                    <span style={{ 
                        background: h.type === 'pharmacy' ? '#10b981' : '#1e5eff', 
                        color: 'white', padding: '2px 8px', borderRadius: '4px', 
                        fontSize: '0.72rem', fontWeight: 600, textTransform: 'capitalize', display: 'inline-block', marginBottom: '8px' 
                    }}>
                      {h.type}
                    </span>

                    <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, color: 'var(--secondary)' }}>📏 {h.distance} km away</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Interactive Map */}
        <div style={{ position: 'sticky', top: '100px', height: '640px', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-sm)' }}>
          <LeafletMap 
            userLoc={userLoc} 
            locationGranted={locationGranted} 
            hospitals={hospitals} 
            mapInstanceRef={mapInstanceRef}
          />
        </div>

      </div>
    </div>
  );
}
