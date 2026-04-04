import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

// ── Shared helpers ─────────────────────────────────────────────────────────────
const timeAgo = (d) => {
  const mins = Math.floor((Date.now() - new Date(d)) / 60000);
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
};

const STATUS_PILL = {
  pending:         { bg: 'rgba(245,158,11,0.12)', color: '#d97706' },
  pending_payment: { bg: 'rgba(245,158,11,0.12)', color: '#d97706' },
  payment_done:    { bg: 'rgba(99,102,241,0.12)', color: '#6366f1' },
  accepted:        { bg: 'rgba(34,197,94,0.12)',  color: '#16a34a' },
  completed:       { bg: 'rgba(30,94,255,0.12)',  color: '#1E5EFF' },
  rejected:        { bg: 'rgba(239,68,68,0.12)',  color: '#dc2626' },
  approved:        { bg: 'rgba(34,197,94,0.12)',  color: '#16a34a' },
  open:            { bg: 'rgba(30,94,255,0.12)',  color: '#1E5EFF' },
};

function Pill({ status }) {
  const s = STATUS_PILL[status] || STATUS_PILL.pending;
  return (
    <span style={{ ...s, padding: '3px 12px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'capitalize' }}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// REGULAR USER PROFILE / DASHBOARD
// ════════════════════════════════════════════════════════════════════════════
const USER_TABS = [
  { key: 'dashboard', icon: '🏠', label: 'Dashboard' },
  { key: 'info',      icon: '👤', label: 'Personal Info' },
  { key: 'questions', icon: '💬', label: 'My Forum Queries' },
];

function UserProfile({ user, login }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState('');
  const [form, setForm] = useState({
    name: '', gender: '', age: '', bloodGroup: '', phone: '', bio: '',
  });
  
  const [myQuestions, setMyQuestions] = useState([]);
  const [qLoading, setQLoading] = useState(false);

  useEffect(() => {
    if (user) setForm({ name: user.name || '', gender: user.gender || '', age: user.age || '', bloodGroup: user.bloodGroup || '', phone: user.phone || '', bio: user.bio || '' });
  }, [user]);

  useEffect(() => {
    if (activeTab === 'questions' || activeTab === 'dashboard') {
      setQLoading(true);
      axios.get('/api/questions/my').then(r => setMyQuestions(r.data)).catch(() => {}).finally(() => setQLoading(false));
    }
  }, [activeTab]);

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setSuccess('');
    try {
      const res = await axios.patch('/api/auth/profile', form);
      login({ ...res.data, token: user.token });
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { alert(err.response?.data?.message || 'Failed to update profile'); }
    finally { setLoading(false); }
  };

  return (
    <div className="page-wrapper" style={{ paddingTop: '150px', minHeight: '100vh', background: 'linear-gradient(145deg, #f8fafc 0%, #e8f0fe 100%)', paddingBottom: '60px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 24px' }}>
        
        {/* Header Banner */}
        <div style={{ background: 'linear-gradient(135deg, #1E5EFF 0%, #4facfe 100%)', borderRadius: '24px', padding: '40px', marginBottom: '24px', color: 'white', display: 'flex', alignItems: 'center', gap: '24px', boxShadow: '0 8px 30px rgba(30,94,255,0.2)' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 900, border: '3px solid rgba(255,255,255,0.4)', flexShrink: 0 }}>
            {user.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <h2 style={{ color: 'white', margin: 0, marginBottom: '6px' }}>{user.name}</h2>
            <div style={{ opacity: 0.85, fontSize: '0.9rem' }}>{user.email}</div>
            <div style={{ marginTop: '8px', background: 'rgba(255,255,255,0.2)', display: 'inline-block', padding: '4px 14px', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 700 }}>
              Patient Account
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: '1px solid rgba(30,94,255,0.08)', marginBottom: '24px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {USER_TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '10px 18px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '6px',
                background: activeTab === tab.key ? 'linear-gradient(135deg, rgba(30,94,255,0.12), rgba(79,172,254,0.08))' : 'transparent',
                color: activeTab === tab.key ? '#1E5EFF' : '#64748b',
                transition: 'all 0.2s ease',
              }}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Area */}
        <div style={{ background: 'white', borderRadius: '24px', padding: '32px', boxShadow: '0 8px 40px rgba(0,0,0,0.06)', border: '1px solid rgba(30,94,255,0.08)', animation: 'fadeInUp 0.4s ease' }}>
          
          {/* DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div>
              <h3 style={{ marginBottom: '24px', color: '#0f172a' }}>🏠 My Dashboard</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                <Link to="/private-chats" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(147,197,253,0.1))', padding: '24px', borderRadius: '16px', border: '1px solid rgba(59,130,246,0.2)', transition: 'transform 0.2s' }} className="hover-lift">
                    <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🔒</div>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1d4ed8', marginBottom: '6px' }}>Private Chats</div>
                    <div style={{ color: '#64748b', fontSize: '0.85rem' }}>Talk privately with verified doctors and manage your chat requests.</div>
                  </div>
                </Link>
                <Link to="/my-consultations" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(110,231,183,0.1))', padding: '24px', borderRadius: '16px', border: '1px solid rgba(16,185,129,0.2)', transition: 'transform 0.2s' }} className="hover-lift">
                    <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🎥</div>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#047857', marginBottom: '6px' }}>Video Consultations</div>
                    <div style={{ color: '#64748b', fontSize: '0.85rem' }}>View your upcoming and past virtual consultation appointments.</div>
                  </div>
                </Link>
              </div>

              <h4 style={{ marginBottom: '16px', color: '#0f172a' }}>Recent Queries</h4>
              {qLoading ? <div className="spinner" /> : myQuestions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', background: '#f8fafc', borderRadius: '12px' }}>No queries asked yet. <Link to="/ask" style={{ color: '#1E5EFF', fontWeight: 600 }}>Ask one now!</Link></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {myQuestions.slice(0, 3).map(q => (
                    <Link to={`/forum/${q._id}`} key={q._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9', textDecoration: 'none', color: 'inherit' }} className="hover-lift">
                      <div>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                          <span style={{ background: 'rgba(30,94,255,0.1)', color: '#1E5EFF', padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700 }}>{q.category}</span>
                          <Pill status={q.status} />
                        </div>
                        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.95rem' }}>{q.title}</div>
                      </div>
                      <span style={{ color: '#1E5EFF' }}>→</span>
                    </Link>
                  ))}
                  {myQuestions.length > 3 && <button className="btn btn-ghost" onClick={() => setActiveTab('questions')} style={{ alignSelf: 'center', marginTop: '10px' }}>View all your queries</button>}
                </div>
              )}
            </div>
          )}

          {/* PERSONAL INFO */}
          {activeTab === 'info' && (
            <div>
              <h3 style={{ marginBottom: '24px', color: '#0f172a' }}>👤 Update Personal Info</h3>
              {success && <div className="alert alert-success" style={{ marginBottom: '24px' }}>{success}</div>}
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" className="form-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Gender</label>
                    <select className="form-input" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                      <option value="">Select…</option>
                      <option>Male</option><option>Female</option><option>Other</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Age</label>
                    <input type="number" className="form-input" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Blood Group</label>
                    <select className="form-input" value={form.bloodGroup} onChange={e => setForm({ ...form, bloodGroup: e.target.value })}>
                      <option value="">Select…</option>
                      {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b => <option key={b}>{b}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input type="text" className="form-input" placeholder="+91 xxxxxxxxxx" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Medical History / Notes (Optional)</label>
                  <textarea className="form-input" rows={4} value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} />
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading} style={{ minWidth: '150px' }}>
                  {loading ? 'Saving…' : 'Save Changes'}
                </button>
              </form>
            </div>
          )}

          {/* MY QUESTIONS */}
          {activeTab === 'questions' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ margin: 0, color: '#0f172a' }}>💬 My Forum Queries</h3>
                <Link to="/ask" className="btn btn-primary btn-sm">+ Ask New</Link>
              </div>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '24px' }}>Click on a query to view detailed professional responses.</p>
              
              {qLoading ? <div className="spinner" /> : myQuestions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '16px' }}>💬</div>
                  <div style={{ fontWeight: 600 }}>You haven't asked any questions yet.</div>
                  <Link to="/ask" className="btn btn-primary" style={{ marginTop: '16px', display: 'inline-flex' }}>Ask a Question</Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {myQuestions.map(q => (
                    <Link to={`/forum/${q._id}`} key={q._id} style={{ background: '#f8fafc', borderRadius: '16px', padding: '24px', border: '1px solid #f1f5f9', display: 'block', textDecoration: 'none', color: 'inherit', transition: 'all 0.2s' }} className="hover-lift">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ background: 'rgba(30,94,255,0.1)', color: '#1E5EFF', padding: '3px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700 }}>{q.category}</span>
                          <Pill status={q.status} />
                        </div>
                        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{timeAgo(q.createdAt)}</span>
                      </div>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '1.05rem', marginBottom: '6px' }}>{q.title}</div>
                      <div style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{q.description}</div>
                      <div style={{ marginTop: '16px', display: 'flex', gap: '16px', fontSize: '0.85rem', color: '#64748b', paddingTop: '16px', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                        <span>💬 {q.answersCount || 0} professional answers</span>
                        <span>👁 {q.views || 0} views</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
      <style>{`
        .hover-lift:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.06) !important; border-color: rgba(30,94,255,0.2) !important; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// DOCTOR / STUDENT PROFILE
// ════════════════════════════════════════════════════════════════════════════
const PROF_TABS = [
  { key: 'info',          icon: '👤', label: 'Personal Info' },
  { key: 'professional',  icon: '🩺', label: 'Professional Details' },
  { key: 'answers',       icon: '💬', label: 'My Answers' },
  { key: 'consultations', icon: '📋', label: 'Consultations', doctorOnly: true },
  { key: 'lounge',        icon: '🏥', label: 'Lounge Posts' },
  { key: 'reviews',       icon: '⭐', label: 'Reviews', doctorOnly: true },
];

function DoctorProfile({ user, login }) {
  const isDoctor = user.role === 'doctor';
  const [activeTab, setActiveTab] = useState('info');

  // ── Stats ────────────────────────────────────────────────────────────────────
  const [stats, setStats] = useState(null);

  // ── Info form ────────────────────────────────────────────────────────────────
  const [infoForm, setInfoForm] = useState({
    name: '', gender: '', age: '', bloodGroup: '', phone: '',
  });
  // ── Professional form ────────────────────────────────────────────────────────
  const [profForm, setProfForm] = useState({
    specialty: '', institution: '', experience: '', consultationFee: '', responseTime: '', bio: '',
  });

  const [infoSuccess, setInfoSuccess]   = useState('');
  const [profSuccess, setProfSuccess]   = useState('');
  const [saving, setSaving]             = useState(false);

  // ── Tab data ─────────────────────────────────────────────────────────────────
  const [myAnswers,       setMyAnswers]       = useState([]);
  const [myConsultations, setMyConsultations] = useState([]);
  const [myPosts,         setMyPosts]         = useState([]);
  const [reviews,         setReviews]         = useState([]);
  const [tabLoading,      setTabLoading]      = useState(false);

  // Init form from user
  useEffect(() => {
    if (!user) return;
    setInfoForm({ name: user.name || '', gender: user.gender || '', age: user.age || '', bloodGroup: user.bloodGroup || '', phone: user.phone || '' });
    setProfForm({ specialty: user.specialty || '', institution: user.institution || '', experience: user.experience || '', consultationFee: user.consultationFee || '', responseTime: user.responseTime || '', bio: user.bio || '' });
    fetchStats();
  }, [user]);

  const fetchStats = async () => {
    try { const { data } = await axios.get('/api/auth/doctor-stats'); setStats(data); } catch {}
  };

  const loadTabData = useCallback(async (tab) => {
    setTabLoading(true);
    try {
      if (tab === 'answers') {
        const { data } = await axios.get('/api/answers/my');
        setMyAnswers(data || []);
      }
      if (tab === 'consultations' && isDoctor) {
        const { data } = await axios.get('/api/consultations/doctor');
        setMyConsultations(data || []);
      }
      if (tab === 'lounge') {
        const { data } = await axios.get('/api/lounge/my');
        setMyPosts(data.posts || []);
      }
      if (tab === 'reviews' && isDoctor) {
        const { data } = await axios.get(`/api/doctors/${user._id}/ratings`);
        setReviews(Array.isArray(data) ? data : []);
      }
    } catch {} finally { setTabLoading(false); }
  }, [user, isDoctor]);

  useEffect(() => { loadTabData(activeTab); }, [activeTab]);

  const handleInfoSave = async (e) => {
    e.preventDefault(); setSaving(true); setInfoSuccess('');
    try {
      const res = await axios.patch('/api/auth/profile', infoForm);
      login({ ...res.data, token: user.token });
      setInfoSuccess('Personal details updated!');
      setTimeout(() => setInfoSuccess(''), 3000);
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleProfSave = async (e) => {
    e.preventDefault(); setSaving(true); setProfSuccess('');
    try {
      const res = await axios.patch('/api/auth/profile', profForm);
      login({ ...res.data, token: user.token });
      setProfSuccess('Professional details updated!');
      setTimeout(() => setProfSuccess(''), 3000);
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const tabs = PROF_TABS.filter(t => !t.doctorOnly || isDoctor);

  return (
    <div className="page-wrapper" style={{ paddingTop: '150px', minHeight: '100vh', background: 'linear-gradient(145deg, #f8fafc 0%, #e8f0fe 100%)', paddingBottom: '60px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px' }}>

        {/* ── Cover / Banner ───────────────────────────────────────────────── */}
        <div style={{ background: 'linear-gradient(135deg, #0A2540 0%, #1E5EFF 60%, #4facfe 100%)', borderRadius: '24px', padding: '40px', marginBottom: '24px', color: 'white', position: 'relative', overflow: 'hidden' }}>
          {/* Decorative blobs */}
          <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '200px', height: '200px', background: 'rgba(255,255,255,0.06)', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', bottom: '-20px', right: '100px', width: '120px', height: '120px', background: 'rgba(255,255,255,0.04)', borderRadius: '50%' }} />

          <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap', position: 'relative' }}>
            {/* Avatar */}
            <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', fontWeight: 900, border: '4px solid rgba(255,255,255,0.4)', boxShadow: '0 8px 30px rgba(0,0,0,0.2)', flexShrink: 0 }}>
              {user.name?.[0]?.toUpperCase()}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
                <h2 style={{ color: 'white', margin: 0, fontSize: 'clamp(1.4rem, 3vw, 2rem)' }}>{user.name}</h2>
                <span style={{ background: isDoctor ? 'rgba(34,197,94,0.3)' : 'rgba(99,102,241,0.3)', border: `1px solid ${isDoctor ? 'rgba(34,197,94,0.5)' : 'rgba(99,102,241,0.5)'}`, padding: '4px 14px', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 800 }}>
                  {isDoctor ? '✓ Verified Doctor' : '🎓 Medical Student'}
                </span>
              </div>
              <div style={{ opacity: 0.85, fontSize: '0.95rem', marginBottom: '4px' }}>
                {user.specialty && `${user.specialty} · `}{user.institution}
              </div>
              <div style={{ opacity: 0.7, fontSize: '0.85rem' }}>{user.email}</div>

              {/* Stats row */}
              {stats && (
                <div style={{ display: 'flex', gap: '24px', marginTop: '20px', flexWrap: 'wrap' }}>
                  {[
                    { label: 'Answers', value: stats.answers.total },
                    { label: 'Lounge', value: stats.loungePosts },
                    ...(isDoctor ? [
                      { label: 'Patients', value: stats.patientCount },
                      { label: 'Rating', value: stats.rating ? `${stats.rating}★` : '–' },
                    ] : []),
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.6rem', fontWeight: 900 }}>{s.value}</div>
                      <div style={{ fontSize: '0.78rem', opacity: 0.75, fontWeight: 600 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Link to={user?.role === 'student' ? '/student-portal' : '/doctor-portal'} className="btn" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(10px)', flexShrink: 0 }}>
              🚀 Dashboard
            </Link>
          </div>
        </div>

        {/* ── Tab Navigation ───────────────────────────────────────────────── */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: '1px solid rgba(30,94,255,0.08)', marginBottom: '24px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '10px 18px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '6px',
                background: activeTab === tab.key ? 'linear-gradient(135deg, rgba(30,94,255,0.12), rgba(79,172,254,0.08))' : 'transparent',
                color: activeTab === tab.key ? '#1E5EFF' : '#64748b',
                transition: 'all 0.2s ease',
              }}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab Content ──────────────────────────────────────────────────── */}
        <div style={{ background: 'white', borderRadius: '24px', padding: '32px', boxShadow: '0 8px 40px rgba(0,0,0,0.06)', border: '1px solid rgba(30,94,255,0.08)', animation: 'fadeInUp 0.4s ease' }}>

          {/* ─── PERSONAL INFO ──────────────────────────────────────────────── */}
          {activeTab === 'info' && (
            <div>
              <h3 style={{ marginBottom: '24px', color: '#0f172a' }}>👤 Personal Details</h3>
              {infoSuccess && <div className="alert alert-success" style={{ marginBottom: '20px' }}>{infoSuccess}</div>}
              <form onSubmit={handleInfoSave}>
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" className="form-input" required value={infoForm.name} onChange={e => setInfoForm({ ...infoForm, name: e.target.value })} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Gender</label>
                    <select className="form-input" value={infoForm.gender} onChange={e => setInfoForm({ ...infoForm, gender: e.target.value })}>
                      <option value="">Select…</option>
                      <option>Male</option><option>Female</option><option>Other</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Age</label>
                    <input type="number" className="form-input" value={infoForm.age} onChange={e => setInfoForm({ ...infoForm, age: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Blood Group</label>
                    <select className="form-input" value={infoForm.bloodGroup} onChange={e => setInfoForm({ ...infoForm, bloodGroup: e.target.value })}>
                      <option value="">Select…</option>
                      {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b => <option key={b}>{b}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input type="text" className="form-input" placeholder="+91 xxxxxxxxxx" value={infoForm.phone} onChange={e => setInfoForm({ ...infoForm, phone: e.target.value })} />
                </div>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Personal Info'}</button>
              </form>
            </div>
          )}

          {/* ─── PROFESSIONAL DETAILS ───────────────────────────────────────── */}
          {activeTab === 'professional' && (
            <div>
              <h3 style={{ marginBottom: '24px', color: '#0f172a' }}>🩺 Professional Details</h3>
              {profSuccess && <div className="alert alert-success" style={{ marginBottom: '20px' }}>{profSuccess}</div>}
              <form onSubmit={handleProfSave}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Specialty / Field</label>
                    <input type="text" className="form-input" placeholder="e.g. Cardiologist" value={profForm.specialty} onChange={e => setProfForm({ ...profForm, specialty: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Hospital / Institution</label>
                    <input type="text" className="form-input" placeholder="e.g. AIIMS Delhi" value={profForm.institution} onChange={e => setProfForm({ ...profForm, institution: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>{isDoctor ? 'Years of Experience' : 'Year of Study'}</label>
                    <input type="text" className="form-input" placeholder={isDoctor ? 'e.g. 8 years' : 'e.g. 3rd Year'} value={profForm.experience} onChange={e => setProfForm({ ...profForm, experience: e.target.value })} />
                  </div>
                  {isDoctor && (
                    <>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Consultation Fee (₹)</label>
                        <input type="number" className="form-input" min="0" placeholder="e.g. 500" value={profForm.consultationFee} onChange={e => setProfForm({ ...profForm, consultationFee: e.target.value })} />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Typical Response Time</label>
                        <select className="form-input" value={profForm.responseTime} onChange={e => setProfForm({ ...profForm, responseTime: e.target.value })}>
                          <option value="">Select…</option>
                          {['< 30 min','< 1 hr','< 2 hrs','< 3 hrs','< 6 hrs','< 12 hrs'].map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                    </>
                  )}
                </div>
                <div className="form-group">
                  <label>Professional Bio</label>
                  <textarea className="form-input" rows={5} placeholder="Describe your expertise, specializations, research interests…" value={profForm.bio} onChange={e => setProfForm({ ...profForm, bio: e.target.value })} />
                </div>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Professional Details'}</button>
              </form>
            </div>
          )}

          {/* ─── MY ANSWERS ─────────────────────────────────────────────────── */}
          {activeTab === 'answers' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ margin: 0, color: '#0f172a' }}>💬 My Submitted Answers</h3>
                <Link to={user?.role === 'student' ? '/student-portal' : '/doctor-portal'} className="btn btn-primary btn-sm">Answer More Questions →</Link>
              </div>
              {tabLoading ? <div className="spinner" /> : myAnswers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '16px' }}>💬</div>
                  <div style={{ fontWeight: 600 }}>No answers submitted yet.</div>
                  <Link to={user?.role === 'student' ? '/student-portal' : '/doctor-portal'} className="btn btn-primary" style={{ marginTop: '16px', display: 'inline-flex' }}>Go Answer Questions</Link>
                </div>
              ) : myAnswers.map(a => (
                <div key={a._id} style={{ background: '#f8fafc', borderRadius: '16px', padding: '20px', marginBottom: '14px', border: '1px solid #f1f5f9', display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', alignItems: 'start' }}>
                  <div>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                      <Pill status={a.status} />
                      {a.question && <span style={{ background: 'rgba(30,94,255,0.08)', color: '#1E5EFF', padding: '3px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>{a.question.category}</span>}
                    </div>
                    {a.question && (
                      <Link to={`/forum/${a.question._id}`} style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem', textDecoration: 'none', display: 'block', marginBottom: '8px' }}>
                        Q: {a.question.title}
                      </Link>
                    )}
                    <div style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{a.text}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '4px' }}>{timeAgo(a.createdAt)}</div>
                    <div style={{ color: '#64748b', fontSize: '0.8rem' }}>▲ {a.upvotes?.length || 0} upvotes</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ─── MY CONSULTATIONS ───────────────────────────────────────────── */}
          {activeTab === 'consultations' && isDoctor && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ margin: 0, color: '#0f172a' }}>📋 My Consultations</h3>
                <Link to={user?.role === 'student' ? '/student-portal' : '/doctor-portal'} className="btn btn-primary btn-sm">Manage →</Link>
              </div>
              {tabLoading ? <div className="spinner" /> : myConsultations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📋</div>
                  <div style={{ fontWeight: 600 }}>No consultations yet.</div>
                </div>
              ) : myConsultations.map(c => (
                <div key={c._id} style={{ background: '#f8fafc', borderRadius: '16px', padding: '20px', marginBottom: '14px', border: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>{c.patient?.name || 'Patient'}</div>
                    <div style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '4px' }}>📅 {c.slotDay} · {c.slotTime}</div>
                    <div style={{ color: '#1E5EFF', fontWeight: 700, fontSize: '0.85rem' }}>₹{c.fee}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    <Pill status={c.status} />
                    <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>{timeAgo(c.createdAt)}</span>
                    {c.status === 'payment_done' && (
                      <Link to={user?.role === 'student' ? '/student-portal' : '/doctor-portal'} className="btn btn-primary btn-sm" style={{ marginTop: '4px' }}>Respond →</Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ─── LOUNGE POSTS ───────────────────────────────────────────────── */}
          {activeTab === 'lounge' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ margin: 0, color: '#0f172a' }}>🏥 My Lounge Discussions</h3>
                <Link to="/lounge" className="btn btn-primary btn-sm">Open Lounge →</Link>
              </div>
              {tabLoading ? <div className="spinner" /> : myPosts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📝</div>
                  <div style={{ fontWeight: 600 }}>No discussions posted yet.</div>
                  <Link to="/lounge" className="btn btn-primary" style={{ marginTop: '16px', display: 'inline-flex' }}>Go to Lounge</Link>
                </div>
              ) : myPosts.map(p => (
                <Link to={`/lounge/${p._id}`} key={p._id} style={{ textDecoration: 'none', color: 'inherit', display: 'block', marginBottom: '14px' }}>
                  <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '20px', border: '1px solid #f1f5f9', transition: 'all 0.2s' }} className="hover-lift">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                      <span style={{ background: 'rgba(124,58,237,0.1)', color: '#7c3aed', padding: '3px 12px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700 }}>{p.category}</span>
                      <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{timeAgo(p.createdAt)}</span>
                    </div>
                    <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>{p.title}</div>
                    <div style={{ color: '#64748b', fontSize: '0.85rem', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.description}</div>
                    <div style={{ display: 'flex', gap: '16px', marginTop: '12px', color: '#94a3b8', fontSize: '0.8rem' }}>
                      <span>▲ {p.upvotes?.length || 0}</span>
                      <span>💬 {p.repliesCount || 0} replies</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* ─── REVIEWS ────────────────────────────────────────────────────── */}
          {activeTab === 'reviews' && isDoctor && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ margin: 0, color: '#0f172a' }}>⭐ Patient Reviews</h3>
                {stats && (
                  <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '12px', padding: '10px 20px', display: 'flex', gap: '16px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#d97706' }}>{stats.rating || '—'}</div>
                      <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Rating</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#d97706' }}>{stats.reviewCount}</div>
                      <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Reviews</div>
                    </div>
                  </div>
                )}
              </div>
              {tabLoading ? <div className="spinner" /> : reviews.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⭐</div>
                  <div style={{ fontWeight: 600 }}>No reviews yet.</div>
                  <div style={{ fontSize: '0.9rem', marginTop: '8px' }}>Reviews from patients will appear here after consultations.</div>
                </div>
              ) : reviews.map((r, i) => (
                <div key={i} style={{ background: '#f8fafc', borderRadius: '16px', padding: '20px', marginBottom: '14px', border: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{r.user?.name || 'Anonymous'}</div>
                    <div style={{ color: '#f59e0b', fontSize: '1rem' }}>{'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}</div>
                  </div>
                  {r.comment && <div style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.6 }}>{r.comment}</div>}
                  <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '8px' }}>{timeAgo(r.date)}</div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

      <style>{`
        .hover-lift:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08) !important; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT — route to correct profile type
// ════════════════════════════════════════════════════════════════════════════
export default function Profile() {
  const { user, login } = useAuth();
  if (!user) return null;

  if (user.role === 'doctor' || user.role === 'student') {
    return <DoctorProfile user={user} login={login} />;
  }
  return <UserProfile user={user} login={login} />;
}
