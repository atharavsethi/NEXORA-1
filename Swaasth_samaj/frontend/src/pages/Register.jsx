import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '', email: '', password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = new FormData();
      Object.keys(formData).forEach(k => { if (formData[k]) data.append(k, formData[k]); });
      data.append('role', 'user');

      const res = await axios.post('/api/auth/register', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      login(res.data);
      if (!res.data.verified) {
        alert('✅ Account created! Your credentials are under review. You can browse the platform while waiting.');
        navigate('/');
      } else {
        navigate('/forum');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { key: 'user', label: 'Patient / User', icon: '👤', desc: 'Ask health questions, view answers' },
    { key: 'doctor', label: 'Doctor', icon: '🩺', desc: 'Verified credentials required' },
    { key: 'student', label: 'Med Student', icon: '🎓', desc: 'Student ID proof required' },
  ];

  return (
    <div style={{ minHeight: '100vh', paddingTop: '80px', background: 'var(--bg-light)', paddingBottom: '40px' }}>
      <div className="container" style={{ maxWidth: '640px' }}>
        <div className="glass-card" style={{ padding: '40px', marginTop: '20px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h2 style={{ marginBottom: '8px' }}>Join Swasth Samaj</h2>
            <p style={{ color: 'var(--text-muted)' }}>Create your free patient account</p>
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: '20px' }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Full Name *</label>
              <input type="text" name="name" className="form-input" required placeholder="Your full name"
                value={formData.name} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Email Address *</label>
              <input type="email" name="email" className="form-input" required placeholder="you@example.com"
                value={formData.email} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Password * (min 6 characters)</label>
              <input type="password" name="password" className="form-input" required minLength={6}
                placeholder="Create a strong password" value={formData.password} onChange={handleChange} />
            </div>

            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }} disabled={loading}>
              {loading ? '⏳ Creating Account...' : '🚀 Create Account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
