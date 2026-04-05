import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

function StarPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: '4px', cursor: 'pointer' }}>
      {[1,2,3,4,5].map(s => (
        <span key={s} onClick={() => onChange(s)}
          style={{ fontSize: '1.8rem', color: s <= value ? '#f59e0b' : '#e2e8f0', transition: 'color 0.15s' }}>
          ★
        </span>
      ))}
    </div>
  );
}

export default function DoctorProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [ratingMsg, setRatingMsg] = useState('');

  useEffect(() => { fetchDoctor(); }, [id]);

  const fetchDoctor = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`/api/doctors/${id}`);
      setDoc(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const submitRating = async () => {
    if (!stars) return;
    try {
      await axios.post(`/api/doctors/${id}/rate`, { stars, comment });
      setRatingMsg('✅ Thank you for your rating!');
      setStars(0); setComment('');
      fetchDoctor();
    } catch (err) {
      setRatingMsg(err.response?.data?.message || 'Failed to submit rating');
    }
  };

  if (loading) return <div className="spinner" style={{ marginTop: '200px' }} />;
  if (!doc) return <div className="page-wrapper container" style={{ textAlign: 'center', paddingTop: '120px' }}><h3>Doctor not found</h3><Link to="/doctors">← Back to Doctors</Link></div>;

  return (
    <div className="page-wrapper container" style={{ maxWidth: '860px', paddingBottom: '60px' }}>
      <Link to="/doctors" style={{ color: 'var(--primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '24px' }}>
        ← All Doctors
      </Link>

      {/* Profile header */}
      <div className="glass-card" style={{ padding: '36px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* Avatar */}
          <div style={{
            width: '100px', height: '100px', flexShrink: 0,
            background: `linear-gradient(135deg, var(--primary), #4facfe)`,
            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2rem', fontWeight: 800, color: 'white',
            boxShadow: '0 8px 32px rgba(30,94,255,0.25)'
          }}>
            {doc.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>

          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '8px' }}>
              <span className="verified-badge verified-doctor">✓ Verified Doctor</span>
              <span style={{
                padding: '3px 10px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 700,
                background: doc.online ? 'rgba(34,197,94,0.15)' : 'rgba(100,116,139,0.1)',
                color: doc.online ? 'var(--success)' : 'var(--text-muted)',
                border: `1px solid ${doc.online ? 'rgba(34,197,94,0.3)' : 'rgba(100,116,139,0.2)'}`
              }}>
                ⚡ {doc.online ? 'Available Now' : 'Currently Offline'}
              </span>
            </div>
            <h2 style={{ marginBottom: '4px' }}>{doc.name}</h2>
            <p style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '1rem', marginBottom: '4px' }}>{doc.specialty}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '14px' }}>🏥 {doc.institution}</p>

            {/* Rating */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <span style={{ color: '#f59e0b', fontSize: '1.3rem' }}>{'★'.repeat(Math.round(doc.rating || 0))}{'☆'.repeat(5 - Math.round(doc.rating || 0))}</span>
              <span style={{ fontWeight: 700, color: 'var(--secondary)' }}>{(doc.rating || 0).toFixed(1)}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>({doc.reviewCount || 0} reviews)</span>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              {[
                { icon: '👥', label: `${doc.patientCount || 0} Patients` },
                { icon: '📋', label: doc.experience || 'N/A' },
                { icon: '⏱', label: `Responds ${doc.responseTime || 'N/A'}` },
                { icon: '💬', label: `${doc.answersCount || 0} Answers` },
              ].map(s => (
                <div key={s.label} style={{
                  padding: '8px 14px', background: 'var(--bg-light)', borderRadius: '10px',
                  fontSize: '0.82rem', fontWeight: 600, color: 'var(--secondary)'
                }}>
                  {s.icon} {s.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {doc.bio && (
          <>
            <div className="divider" style={{ margin: '24px 0 16px' }} />
            <h4 style={{ marginBottom: '10px' }}>About</h4>
            <p style={{ lineHeight: '1.7', color: 'var(--text-muted)' }}>{doc.bio}</p>
          </>
        )}

        {doc.specialty && (
          <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[doc.specialty, 'Consultation', 'Diagnosis', 'Treatment Plan'].map(tag => (
              <span key={tag} className="category-badge">{tag}</span>
            ))}
          </div>
        )}

        {/* Book Consultation Button */}
        {user && user.role === 'user' && doc.online && (
          <div style={{ marginTop: '24px' }}>
            <Link to={`/consultation-booking/${doc._id}`} className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }}>
              ✦ Book Paid Consultation
            </Link>
          </div>
        )}
      </div>

      {/* Rate this doctor */}
      {user && user.role === 'user' && (
        <div className="glass-card" style={{ padding: '28px', marginBottom: '24px' }}>
          <h4 style={{ marginBottom: '16px' }}>⭐ Rate This Doctor</h4>
          <StarPicker value={stars} onChange={setStars} />
          <textarea className="form-input" placeholder="Share your experience (optional)..."
            value={comment} onChange={e => setComment(e.target.value)}
            style={{ marginTop: '14px', minHeight: '80px' }} />
          {ratingMsg && <p style={{ color: ratingMsg.startsWith('✅') ? 'var(--success)' : 'var(--danger)', marginTop: '8px', fontSize: '0.9rem' }}>{ratingMsg}</p>}
          <button className="btn btn-primary" style={{ marginTop: '12px' }} onClick={submitRating} disabled={!stars}>
            Submit Rating
          </button>
        </div>
      )}

      {/* Reviews */}
      <div className="glass-card" style={{ padding: '28px' }}>
        <h4 style={{ marginBottom: '20px' }}>💬 Patient Reviews ({(doc.reviews || []).length})</h4>
        {(!doc.reviews || doc.reviews.length === 0) ? (
          <div className="empty-state" style={{ padding: '30px 0' }}>
            <div className="icon">⭐</div>
            <p>No reviews yet. Be the first!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {doc.reviews.map((r, i) => (
              <div key={i} style={{ padding: '18px', background: 'var(--bg-light)', borderRadius: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>
                      {r.user?.name?.[0] || 'U'}
                    </div>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{r.user?.name || 'Patient'}</span>
                  </div>
                  <span style={{ color: '#f59e0b' }}>{'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}</span>
                </div>
                {r.comment && <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>{r.comment}</p>}
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                  {new Date(r.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
