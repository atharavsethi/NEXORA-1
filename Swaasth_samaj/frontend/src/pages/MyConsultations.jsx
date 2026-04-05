import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function MyConsultations() {
  const { user } = useAuth();
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchConsultations();
  }, []);

  const fetchConsultations = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/consultations/my');
      setConsultations(data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch your consultations.');
    } finally {
      setLoading(false);
    }
  };

  const StatusBadge = ({ status }) => {
    let color = 'var(--text-muted)';
    let bg = 'var(--bg-light)';
    let text = status.replace('_', ' ').toUpperCase();

    if (status === 'payment_done') { color = '#3b82f6'; bg = '#eff6ff'; text = 'AWAITING DOCTOR'; }
    if (status === 'accepted') { color = 'var(--success)'; bg = 'rgba(34,197,94,0.1)'; text = 'ACCEPTED'; }
    if (status === 'rejected') { color = 'var(--danger)'; bg = 'rgba(239,68,68,0.1)'; text = 'REJECTED'; }
    if (status === 'completed') { color = 'var(--primary)'; bg = 'rgba(30,94,255,0.1)'; text = 'COMPLETED'; }
    if (status === 'pending_payment') { color = '#f59e0b'; bg = '#fffbeb'; text = 'PENDING PAYMENT'; }

    return (
      <span style={{ 
        padding: '4px 10px', borderRadius: '100px', fontSize: '0.75rem', 
        fontWeight: 700, color, background: bg, border: `1px solid ${color}` 
      }}>
        {text}
      </span>
    );
  };

  if (loading) return <div className="spinner" style={{ marginTop: '200px' }} />;

  return (
    <div className="page-wrapper container" style={{ maxWidth: '900px', paddingBottom: '60px' }}>
      <h2 style={{ marginBottom: '24px' }}>My Consultations</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Track and manage your paid consultation requests.</p>

      {error && <div className="alert alert-error" style={{ marginBottom: '20px' }}>{error}</div>}

      {consultations.length === 0 ? (
        <div className="empty-state" style={{ padding: '60px 20px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🩺</div>
          <h4>No consultations yet</h4>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>You haven't booked any paid consultations.</p>
          <Link to="/doctors" className="btn btn-primary">Find a Doctor</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {consultations.map(c => (
            <div key={c._id} className="glass-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), #4facfe)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.4rem' }}>
                    {c.doctor?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'DR'}
                  </div>
                  <div>
                    <h4 style={{ margin: 0 }}>{c.doctor?.name || 'Unknown Doctor'}</h4>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>{c.doctor?.specialty}</p>
                    <div style={{ fontSize: '0.85rem', color: 'var(--secondary)', marginTop: '4px', fontWeight: 600 }}>
                      🗓 {c.slotDay} • ⏰ {c.slotTime}
                    </div>
                  </div>
                </div>
                <StatusBadge status={c.status} />
              </div>

              {c.symptoms && (
                <div style={{ background: 'var(--bg-light)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', marginBottom: '16px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>YOUR SYMPTOMS / NOTES</span>
                  <p style={{ fontSize: '0.9rem', margin: 0 }}>{c.symptoms}</p>
                </div>
              )}

              {(c.status === 'accepted' || c.status === 'rejected' || c.status === 'completed') && (
                <div style={{ background: c.status === 'rejected' ? 'rgba(239,68,68,0.05)' : 'rgba(34,197,94,0.05)', padding: '16px', borderRadius: 'var(--radius-md)', border: `1px solid ${c.status === 'rejected' ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)'}` }}>
                  <h5 style={{ margin: '0 0 8px 0', color: c.status === 'rejected' ? 'var(--danger)' : 'var(--success)' }}>
                    Doctor's Response
                  </h5>
                  <p style={{ fontSize: '0.9rem', margin: 0, color: 'var(--secondary)' }}>
                    {c.doctorMessage || 'No specific message left by the doctor.'}
                  </p>
                  
                  {c.status === 'accepted' && c.meetLink && (
                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(34,197,94,0.2)' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>POST-CONFIRMATION LINK</span>
                      <a href={c.meetLink} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">
                        Join Meeting / Check Prescription
                      </a>
                    </div>
                  )}
                </div>
              )}

              {c.status === 'pending_payment' && (
                <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-primary" onClick={() => window.location.href=`/consultation-booking/${c.doctorId}`}>Finish Payment</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
