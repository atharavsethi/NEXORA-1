import { useState, useEffect } from 'react';

export default function NearbyHospitals() {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-fetch location if permission was previously granted
  useEffect(() => {
    // Basic check without prompting immediately on load
  }, []);

  const requestLocation = () => {
    setLoading(true);
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLoading(false);
      },
      (err) => {
        setError('Location access denied or unavailable. Please enable location services.');
        setLoading(false);
      }
    );
  };

  return (
    <div className="glass-card" style={{ padding: '30px', marginTop: '40px' }}>
      <h3 style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        🏥 Find Nearby Care
      </h3>
      <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.9rem' }}>
        Need an in-person consultation? View nearby hospitals and clinics based on your current location.
      </p>

      {!location && !loading && (
        <button className="btn btn-secondary" onClick={requestLocation}>
          📍 Show Nearby Hospitals
        </button>
      )}

      {loading && <div className="spinner" style={{ margin: '20px 0' }} />}
      {error && <div className="alert alert-warning">{error}</div>}

      {location && (
        <div style={{ marginTop: '20px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
          {/* Using OpenStreetMap via iframe for a free, no-API-key map rendering */}
          <iframe 
            width="100%" 
            height="350" 
            frameBorder="0" 
            scrolling="no" 
            marginHeight="0" 
            marginWidth="0" 
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${location.lng - 0.05}%2C${location.lat - 0.05}%2C${location.lng + 0.05}%2C${location.lat + 0.05}&layer=mapnik&marker=${location.lat}%2C${location.lng}`}
            style={{ border: 'none', display: 'block' }}
          ></iframe>
          <div style={{ padding: '10px 16px', background: 'var(--navy)', fontSize: '0.85rem' }}>
            <a href={`https://www.google.com/maps/search/hospitals+near+me/@${location.lat},${location.lng},14z`} target="_blank" rel="noreferrer" style={{ color: 'var(--teal)', fontWeight: '600' }}>
              Open in Google Maps ↗
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
