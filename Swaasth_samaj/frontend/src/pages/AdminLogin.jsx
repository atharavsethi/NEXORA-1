import React, { useState } from 'react';
import axios from 'axios';

export default function AdminLogin({ onLogin }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await axios.post('/api/admin/login', form);
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      onLogin(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Logo / Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{
          width: 72, height: 72,
          background: 'linear-gradient(135deg, #16a34a, #15803d)',
          borderRadius: '20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2rem', margin: '0 auto 16px',
          boxShadow: '0 8px 32px rgba(22,163,74,0.4)',
        }}>⚕️</div>
        <h1 style={{ color: 'white', fontSize: '2rem', fontWeight: 800, margin: 0 }}>
          Swasth<span style={{ color: '#4ade80' }}>Samaj</span>
        </h1>
        <p style={{ color: '#f59e0b', fontSize: '0.95rem', fontWeight: 600, marginTop: '6px', letterSpacing: '1px' }}>
          ADMIN CONTROL PANEL
        </p>
      </div>

      {/* Login Card */}
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '40px',
        width: '100%',
        maxWidth: '460px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
      }}>
        <h2 style={{ margin: '0 0 8px', fontSize: '1.7rem', fontWeight: 800, color: '#0f172a' }}>
          Admin Sign In
        </h2>
        <p style={{ color: '#64748b', marginBottom: '32px', fontSize: '0.95rem' }}>
          Restricted access — authorized personnel only.
        </p>

        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca',
            color: '#dc2626', borderRadius: '10px', padding: '12px 16px',
            marginBottom: '20px', fontSize: '0.9rem',
          }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '1px', color: '#475569', marginBottom: '8px' }}>
              ADMIN EMAIL
            </label>
            <input
              type="email"
              required
              placeholder="admin@email.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              style={{
                width: '100%', padding: '14px 16px',
                border: '2px solid #e2e8f0',
                borderRadius: '12px', fontSize: '1rem',
                outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.2s',
                fontFamily: 'inherit',
              }}
              onFocus={e => e.target.style.borderColor = '#16a34a'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>
          <div style={{ marginBottom: '28px' }}>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '1px', color: '#475569', marginBottom: '8px' }}>
              PASSWORD
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              style={{
                width: '100%', padding: '14px 16px',
                border: '2px solid #e2e8f0',
                borderRadius: '12px', fontSize: '1rem',
                outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.2s',
                fontFamily: 'inherit',
              }}
              onFocus={e => e.target.style.borderColor = '#16a34a'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '16px',
              background: loading ? '#86efac' : 'linear-gradient(135deg, #16a34a, #15803d)',
              color: 'white', border: 'none', borderRadius: '12px',
              fontSize: '1.05rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s', fontFamily: 'inherit',
            }}
          >
            {loading ? 'Signing in…' : '🔒 Sign In to Admin Panel'}
          </button>
        </form>
      </div>

      <p style={{ color: '#475569', marginTop: '24px', fontSize: '0.85rem' }}>
        This panel is restricted to authorized administrators only.
      </p>
    </div>
  );
}
