import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const SPECIALTIES = ['All', 'Cardiologist', 'Dermatologist', 'Pediatrician', 'Orthopedician', 'Neurologist', 'Psychiatrist', 'General Physician', 'Gynecologist'];

function StarRating({ rating = 0 }) {
  return (
    <span style={{ color: '#f59e0b', fontSize: '0.9rem' }}>
      {'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))}
      <span style={{ color: 'var(--text-muted)', marginLeft: '4px', fontSize: '0.8rem' }}>({rating.toFixed(1)})</span>
    </span>
  );
}

export default function Doctors() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [specialty, setSpecialty] = useState('All');
  const [search, setSearch] = useState('');
  const [minRating, setMinRating] = useState('');

  useEffect(() => { fetchDoctors(); }, [specialty, minRating]);

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const params = {};
      if (specialty !== 'All') params.specialty = specialty;
      if (minRating) params.minRating = minRating;
      const { data } = await axios.get('/api/doctors', { params });
      setDoctors(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = search
    ? doctors.filter(d => d.name.toLowerCase().includes(search.toLowerCase()) || (d.specialty || '').toLowerCase().includes(search.toLowerCase()))
    : doctors;

  return (
    <div className="page-wrapper container" style={{ paddingBottom: '60px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h2 style={{ marginBottom: '10px' }}>🩺 Our Verified Doctors</h2>
        <p style={{ color: 'var(--text-muted)', maxWidth: '560px', margin: '0 auto' }}>
          All doctors are manually verified. Browse by specialization, view their profiles, and rate your interactions.
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '28px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="text" className="form-input" placeholder="🔍 Search by name or specialty..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: '1 1 220px', maxWidth: '360px', borderRadius: '100px' }} />

        <select className="form-input" value={specialty} onChange={e => setSpecialty(e.target.value)}
          style={{ flex: '0 0 auto', borderRadius: '100px', width: 'auto', paddingRight: '36px' }}>
          {SPECIALTIES.map(s => <option key={s}>{s}</option>)}
        </select>

        <select className="form-input" value={minRating} onChange={e => setMinRating(e.target.value)}
          style={{ flex: '0 0 auto', borderRadius: '100px', width: 'auto' }}>
          <option value="">All Ratings</option>
          <option value="4">4+ ⭐</option>
          <option value="4.5">4.5+ ⭐</option>
        </select>
      </div>

      {/* Category pills */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '16px', marginBottom: '28px' }}>
        {SPECIALTIES.map(s => (
          <button key={s} onClick={() => setSpecialty(s)}
            className={`btn btn-sm ${specialty === s ? 'btn-primary' : 'btn-ghost'}`}
            style={{ borderRadius: '100px', whiteSpace: 'nowrap' }}>
            {s}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? <div className="spinner" /> : filtered.length === 0 ? (
        <div className="empty-state glass-card">
          <div className="icon">🩺</div>
          <p>No doctors found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid-3">
          {filtered.map(doc => (
            <Link to={`/doctors/${doc._id}`} key={doc._id} style={{ textDecoration: 'none' }}>
              <div className="glass-card doctor-card" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
                {/* Online indicator */}
                <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px',
                    borderRadius: '100px', fontSize: '0.72rem', fontWeight: 700,
                    background: doc.online ? 'rgba(34,197,94,0.15)' : 'rgba(100,116,139,0.12)',
                    color: doc.online ? 'var(--success)' : 'var(--text-muted)',
                    border: `1px solid ${doc.online ? 'rgba(34,197,94,0.3)' : 'rgba(100,116,139,0.2)'}`
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: doc.online ? '#22c55e' : '#94a3b8', display: 'inline-block' }} />
                    {doc.online ? 'Online' : 'Offline'}
                  </span>
                </div>

                {/* Avatar */}
                <div style={{
                  width: '68px', height: '68px',
                  background: `linear-gradient(135deg, hsl(${(doc.name.charCodeAt(4) || 0) * 5} 70% 50%), hsl(${(doc.name.charCodeAt(5) || 100) * 3} 80% 65%))`,
                  borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.6rem', fontWeight: 800, color: 'white', marginBottom: '14px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.12)'
                }}>
                  {doc.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>

                <div style={{ marginBottom: '6px' }}>
                  <span className="verified-badge verified-doctor" style={{ fontSize: '0.68rem' }}>✓ Verified Doctor</span>
                </div>

                <h3 style={{ fontSize: '1rem', marginBottom: '4px', color: 'var(--secondary)' }}>{doc.name}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600, marginBottom: '4px' }}>{doc.specialty}</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>{doc.institution}</p>

                <StarRating rating={doc.rating || 0} />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '6px' }}>({doc.reviewCount || 0} reviews)</span>

                {/* Stats row */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap' }}>
                  <span className="doc-stat">👥 {doc.patientCount || 0}</span>
                  <span className="doc-stat">⏱ {doc.responseTime || 'N/A'}</span>
                  <span className="doc-stat">📋 {doc.experience || 'N/A'}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
