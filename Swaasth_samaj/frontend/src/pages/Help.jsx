import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

function StatusBadge({ status }) {
  const map = {
    pending: { color: '#f59e0b', bg: '#fffbeb', label: 'PENDING' },
    in_progress: { color: '#3b82f6', bg: '#eff6ff', label: 'IN PROGRESS' },
    resolved: { color: '#22c55e', bg: '#f0fdf4', label: 'RESOLVED' }
  };
  const s = map[status] || { color: '#64748b', bg: '#f8fafc', label: status.toUpperCase() };
  return (
    <span style={{
      padding: '4px 10px', borderRadius: '12px', fontSize: '0.7rem',
      fontWeight: 700, letterSpacing: '0.5px', color: s.color, background: s.bg,
    }}>{s.label}</span>
  );
}

export default function Help() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const res = await axios.get('/api/support/my');
      setTickets(res.data);
    } catch {
      // Handle error implicitly
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.subject || !form.message) return;
    setSubmitting(true);
    try {
      const res = await axios.post('/api/support', form);
      setTickets([res.data, ...tickets]);
      setForm({ subject: '', message: '' });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit ticket');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="spinner" style={{ margin: '150px auto' }} />;

  return (
    <div className="page-wrapper container" style={{ maxWidth: '900px', paddingBottom: '60px' }}>
      
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '16px' }}>🎧 Help & Support</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Need assistance? Open a support ticket and our team will get back to you.</p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '30px' }}>
        
        {/* Left Side: Create Ticket Form */}
        <div style={{ flex: '1 1 350px' }}>
          <div className="glass-card" style={{ padding: '32px' }}>
            <h3 style={{ marginBottom: '24px' }}>Open New Ticket</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label>Subject</label>
                <input type="text" className="form-input" required placeholder="What do you need help with?" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
              </div>
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label>Message</label>
                <textarea className="form-input" required rows={5} placeholder="Describe your issue in detail..." value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Ticket'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: My Tickets */}
        <div style={{ flex: '2 1 400px' }}>
          <h3 style={{ marginBottom: '24px' }}>My Previous Tickets</h3>
          {tickets.length === 0 ? (
            <div className="glass-card" style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '12px' }}>📩</div>
              <p style={{ color: 'var(--text-muted)' }}>You haven't opened any support tickets yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {tickets.map(t => (
                <div key={t._id} className="glass-card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', paddingRight: '12px' }}>{t.subject}</h4>
                    <StatusBadge status={t.status} />
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: t.response ? '16px' : '0' }}>{t.message}</p>
                  
                  {t.response && (
                    <div style={{ background: 'var(--bg-light)', padding: '12px 16px', borderRadius: '8px', borderLeft: '4px solid var(--primary)' }}>
                      <strong style={{ fontSize: '0.8rem', color: 'var(--primary)', display: 'block', marginBottom: '4px' }}>ADMIN RESPONSE:</strong>
                      <span style={{ fontSize: '0.9rem', color: 'var(--secondary)' }}>{t.response}</span>
                    </div>
                  )}
                  
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '12px', textAlign: 'right' }}>
                    {new Date(t.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
