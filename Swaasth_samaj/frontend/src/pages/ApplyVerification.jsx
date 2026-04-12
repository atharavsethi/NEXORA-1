import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function ApplyVerification() {
  const [step, setStep] = useState(1);
  const role = 'doctor';
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', phone: '',
    licenseNumber: '', specialty: '', institution: '', experience: '',
    college: '', yearOfStudy: ''
  });
  const [credential, setCredential] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const nextStep = () => {
    setError('');
    if (step === 1) {
      if (!formData.name || !formData.email || !formData.password) {
        setError('Please fill in required personal info (Name, Email, Password).');
        return;
      }
      setStep(2);
    }
  };

  const prevStep = () => {
    setStep(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!credential) {
      setError('Please upload your identity/credential document.');
      return;
    }

    setLoading(true);
    try {
      const data = new FormData();
      Object.keys(formData).forEach(k => { if (formData[k]) data.append(k, formData[k]); });
      data.append('role', role);
      data.append('credential', credential);

      const res = await axios.post('/api/auth/register', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      login(res.data);
      alert('✅ Application Submitted! Your credentials are under review by the Swasth Samaj administration. You will be notified once verified.');
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', paddingTop: '80px', background: '#f8fafc', paddingBottom: '60px', fontFamily: "'Inter', sans-serif" }}>
      
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{ fontSize: '3rem', marginBottom: '10px' }}>👨‍⚕️</div>
        <h1 style={{ fontSize: '2.2rem', color: '#0f172a', fontWeight: 800, margin: '0 0 10px' }}>
          Doctor Registration
        </h1>
        <p style={{ color: '#64748b', fontSize: '1.05rem', margin: 0 }}>
          Register as a verified medical professional on Swasth Samaj
        </p>
      </div>

      {/* Stepper */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '40px', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ 
            width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: step === 1 ? 'var(--primary)' : '#e2e8f0', color: step === 1 ? 'white' : '#64748b', fontWeight: 700 
          }}>1</div>
          <span style={{ fontWeight: 700, color: step === 1 ? '#0f172a' : '#64748b', fontSize: '0.9rem' }}>Personal Info</span>
        </div>
        <div style={{ width: 40, height: 1, background: '#cbd5e1' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ 
            width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: step === 2 ? 'var(--primary)' : '#e2e8f0', color: step === 2 ? 'white' : '#64748b', fontWeight: 700 
          }}>2</div>
          <span style={{ fontWeight: 700, color: step === 2 ? '#0f172a' : '#64748b', fontSize: '0.9rem' }}>Credentials</span>
        </div>
      </div>

      {/* Form Card */}
      <div style={{ 
        maxWidth: '600px', margin: '0 auto', background: 'white', 
        borderRadius: '20px', padding: '40px', boxShadow: '0 10px 40px rgba(0,0,0,0.04)' 
      }}>
        
        {error && (
          <div style={{ background: '#fef2f2', color: '#ef4444', padding: '12px 16px', borderRadius: '10px', marginBottom: '24px', border: '1px solid #fca5a5' }}>
            ⚠️ {error}
          </div>
        )}

        {/* STEP 1: Personal Information */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: '24px' }}>Personal Information</h2>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>Full Name *</label>
              <input type="text" name="name" 
                placeholder="Dr. John Doe" 
                value={formData.name} onChange={handleChange}
                style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>Email Address *</label>
              <input type="email" name="email" 
                placeholder="doctor@hospital.com" 
                value={formData.email} onChange={handleChange}
                style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>Phone Number</label>
              <input type="text" name="phone" 
                placeholder="+91 98765 43210" 
                value={formData.phone} onChange={handleChange}
                style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '30px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>Create Password *</label>
              <input type="password" name="password" 
                placeholder="Minimum 6 characters" 
                value={formData.password} onChange={handleChange}
                style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <button onClick={nextStep} style={{
              width: '100%', padding: '16px', borderRadius: '10px', border: 'none',
              background: 'var(--primary)', color: 'white', fontSize: '1.05rem', fontWeight: 700, cursor: 'pointer'
            }}>
              Next: Medical Credentials →
            </button>
          </div>
        )}

        {/* STEP 2: Credentials */}
        {step === 2 && (
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: '24px' }}>
              Medical Credentials
            </h2>
            
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '16px', marginBottom: '24px' }}>
              <div style={{ color: '#1d4ed8', fontWeight: 700, marginBottom: '6px' }}>ℹ️ Important:</div>
              <p style={{ color: '#1e3a8a', fontSize: '0.9rem', margin: 0 }}>
                Your registration number will be cross-verified with official databases. Only valid registrations will be approved.
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>MBBS / MCI Registration Number *</label>
              <input type="text" name="licenseNumber" placeholder="e.g., MCI-12345-2018" value={formData.licenseNumber} onChange={handleChange}
                style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>Specialization</label>
              <input type="text" name="specialty" placeholder="e.g. General Medicine" value={formData.specialty} onChange={handleChange}
                style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>Hospital / Clinic Name</label>
              <input type="text" name="institution" placeholder="Apollo Hospitals, Chennai" value={formData.institution} onChange={handleChange}
                style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>Years of Experience</label>
              <input type="text" name="experience" placeholder="e.g., 8" value={formData.experience} onChange={handleChange}
                style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: '30px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                Upload MBBS Certificate / Gov ID (PDF/Image) *
              </label>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setCredential(e.target.files[0])}
                style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.9rem', boxSizing: 'border-box', background: '#f8fafc' }} />
            </div>

            <div style={{ display: 'flex', gap: '15px' }}>
              <button type="button" onClick={prevStep} style={{
                flex: 1, padding: '16px', borderRadius: '10px', border: '1px solid #cbd5e1',
                background: '#f8fafc', color: '#475569', fontSize: '1.05rem', fontWeight: 700, cursor: 'pointer'
              }}>
                ← Back
              </button>
              <button type="button" onClick={handleSubmit} disabled={loading} style={{
                flex: 2, padding: '16px', borderRadius: '10px', border: 'none',
                background: loading ? 'rgba(30,94,255,0.5)' : 'var(--primary)', color: 'white', fontSize: '1.05rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer'
              }}>
                {loading ? 'Submitting...' : 'Submit Application ✓'}
              </button>
            </div>
            
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
          <p style={{ color: '#64748b', margin: 0 }}>
            Are you a medical student? <Link to="/register-student" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>Apply Here →</Link>
          </p>
        </div>

      </div>
    </div>
  );
}
