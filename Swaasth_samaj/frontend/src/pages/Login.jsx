import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('patient');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [studentId, setStudentId] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await axios.post('/api/auth/login', { 
        email, password, role, 
        ...(role === 'doctor' && { licenseNumber }),
        ...(role === 'student' && { studentId })
      });
      login(data);
      if (data.role === 'admin') navigate('/admin');
      else if (data.role === 'doctor') navigate('/doctor-portal');
      else if (data.role === 'student') navigate('/student-portal');
      else navigate('/forum');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  const RoleCard = ({ type, icon, label }) => {
    const isActive = role === type;
    return (
      <div 
        onClick={() => setRole(type)}
        style={{
          border: `1.5px solid ${isActive ? 'transparent' : 'var(--card-border)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '16px 10px',
          textAlign: 'center',
          cursor: 'pointer',
          background: isActive ? 'linear-gradient(135deg, var(--primary), #4facfe)' : 'var(--white)',
          color: isActive ? 'var(--white)' : 'var(--secondary)',
          boxShadow: isActive ? 'var(--shadow-primary)' : 'none',
          transition: 'all 0.3s ease'
        }}
      >
        <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>{icon}</div>
        <div style={{ fontSize: '0.8rem', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{label}</div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', paddingTop: '74px', backgroundColor: 'var(--bg-light)', flexWrap: 'wrap' }}>
      
      {/* LEFT SIDE: Decorative Branding */}
      <div style={{ 
        flex: '1 1 500px', 
        padding: '60px', 
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        background: 'linear-gradient(145deg, #e0eaf5 0%, #ffffff 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Abstract shapes */}
        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '40vh', height: '40vh', borderRadius: '50%', background: 'radial-gradient(circle, rgba(30, 94, 255, 0.08) 0%, transparent 60%)' }}></div>
        <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '50vh', height: '50vh', borderRadius: '50%', background: 'radial-gradient(circle, rgba(34, 197, 94, 0.05) 0%, transparent 60%)' }}></div>
        
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '500px', margin: '0 auto' }}>
          <div style={{ 
            display: 'inline-flex', padding: '12px', background: 'var(--white)', 
            borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)', marginBottom: '40px' 
          }}>
            <span style={{ fontSize: '2rem', color: 'var(--primary)' }}>✦</span>
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 800, marginLeft: '10px', color: 'var(--secondary)' }}>
              Swasth<span style={{ color: 'var(--primary)' }}>Samaj</span>
            </span>
          </div>

          <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', lineHeight: '1.1', marginBottom: '24px', letterSpacing: '-1px' }}>
            Your Health, <br/>
            Our <span style={{ color: 'var(--accent)' }}>Samaj</span>
          </h1>
          
          <p style={{ fontSize: '1.15rem', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '40px' }}>
            Join thousands of users receiving perfectly verified medical guidance from trusted healthcare professionals, completely securely.
          </p>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: 'var(--white)', padding: '10px 20px', borderRadius: '100px', boxShadow: 'var(--shadow-sm)' }}>
            <span style={{ color: 'var(--success)' }}>✔</span>
            <span style={{ fontWeight: 600, color: 'var(--secondary)' }}>100% Verified Doctors</span>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Login Form */}
      <div style={{ flex: '1 1 500px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', background: 'var(--bg-light)' }}>
        <div className="glass-card" style={{ width: '100%', maxWidth: '440px', padding: '50px 40px', background: 'var(--white)', borderRadius: 'var(--radius-xl)' }}>
          <h2 style={{ marginBottom: '10px', fontSize: '2rem' }}>Welcome Back</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '30px', fontSize: '0.95rem' }}>
            Sign in to continue to your Swasth Samaj dashboard.
          </p>

          {error && <div className="alert alert-error" style={{ marginBottom: '20px' }}>{error}</div>}

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--secondary)', marginBottom: '12px' }}>
              Select Your Role
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <RoleCard type="patient" icon="👤" label="Patient" />
              <RoleCard type="doctor" icon="🩺" label="Doctor" />
              <RoleCard type="student" icon="🎓" label="Student" />
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label>Email Address</label>
              <input type="email" className="form-input" placeholder="you@example.com" required
                value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            
            <div className="form-group" style={{ marginBottom: role === 'patient' || role === 'admin' ? '30px' : '20px' }}>
              <label>Password</label>
              <input type="password" className="form-input" required placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} />
            </div>

            {role === 'doctor' && (
              <div className="form-group" style={{ marginBottom: '30px' }}>
                <label>License / Gov ID</label>
                <input type="text" className="form-input" required placeholder="Registration Number"
                  value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)} />
              </div>
            )}
            
            {role === 'student' && (
              <div className="form-group" style={{ marginBottom: '30px' }}>
                <label>Student ID</label>
                <input type="text" className="form-input" required placeholder="College ID"
                  value={studentId} onChange={e => setStudentId(e.target.value)} />
              </div>
            )}
            
            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }}>
              Sign In as {role.toUpperCase()}
            </button>
          </form>
          
          <div style={{ textAlign: 'center', marginTop: '30px', fontSize: '1rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
              New to Swasth Samaj? <Link to="/register" style={{ color: 'var(--success)', fontWeight: 700, textDecoration: 'none', borderBottom: '2px solid var(--success)' }}>Create an account</Link>
            </p>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
              Are you a Doctor? <Link to="/apply-verification" style={{ color: 'var(--success)', fontWeight: 700, textDecoration: 'none' }}>Verify Here</Link> 
              <span style={{ margin: '0 8px', color: '#cbd5e1' }}>|</span> 
              Student? <Link to="/register-student" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>Apply Here</Link>
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
