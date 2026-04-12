import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const TAB_CONFIG = [
  { key: 'dashboard',      icon: '📊', label: 'Dashboard' },
  { key: 'questions',      icon: '💬', label: 'Answer Questions' },
  { key: 'lounge',         icon: '🏥', label: "Doctor's Lounge" },
  { key: 'slots',          icon: '🗓️', label: 'Manage Slots',     doctorOnly: true },
  { key: 'consultations',  icon: '📋', label: 'Consultations',    doctorOnly: true },
  { key: 'chats',          icon: '🔒', label: 'Private Chats' },
];

const STATUS_COLORS = {
  pending:         { bg: 'rgba(245,158,11,0.12)', color: '#d97706', border: 'rgba(245,158,11,0.3)' },
  pending_payment: { bg: 'rgba(245,158,11,0.12)', color: '#d97706', border: 'rgba(245,158,11,0.3)' },
  payment_done:    { bg: 'rgba(99,102,241,0.12)', color: '#6366f1', border: 'rgba(99,102,241,0.3)' },
  accepted:        { bg: 'rgba(34,197,94,0.12)',  color: '#16a34a', border: 'rgba(34,197,94,0.3)' },
  completed:       { bg: 'rgba(30,94,255,0.12)',  color: '#1E5EFF', border: 'rgba(30,94,255,0.3)' },
  rejected:        { bg: 'rgba(239,68,68,0.12)',  color: '#dc2626', border: 'rgba(239,68,68,0.3)' },
  approved:        { bg: 'rgba(34,197,94,0.12)',  color: '#16a34a', border: 'rgba(34,197,94,0.3)' },
  open:            { bg: 'rgba(30,94,255,0.12)',  color: '#1E5EFF', border: 'rgba(30,94,255,0.3)' },
};

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.pending;
  return (
    <span style={{
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      padding: '3px 10px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'capitalize'
    }}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
}

function StatCard({ icon, label, value, sub, accent = 'var(--primary)' }) {
  return (
    <div style={{
      background: 'white', border: '1px solid rgba(30,94,255,0.1)', borderRadius: '20px',
      padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
      display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative', overflow: 'hidden'
    }}>
      <div style={{ position: 'absolute', top: 0, right: 0, width: '80px', height: '80px',
        background: `radial-gradient(circle at top right, ${accent}15, transparent)`, borderRadius: '0 20px 0 80px' }} />
      <div style={{ fontSize: '2rem' }}>{icon}</div>
      <div style={{ fontSize: '2rem', fontWeight: 900, color: accent, lineHeight: 1 }}>{value}</div>
      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>{label}</div>
      {sub && <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{sub}</div>}
    </div>
  );
}

// ── LOUNGE CATEGORIES ────────────────────────────────────────────────────
const LOUNGE_CATS = ['General Medicine', 'Neurology', 'Endocrinology', 'Pediatrics', 'Cardiology', 'Dermatology'];

export default function DoctorPortal() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const replyToId = searchParams.get('replyTo');

  const [activeTab, setActiveTab] = useState(replyToId ? 'questions' : 'dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Dashboard Stats ──────────────────────────────────────────────────────────
  const [stats, setStats] = useState(null);

  // ── Questions / Answers ──────────────────────────────────────────────────────
  const [questions, setQuestions]   = useState([]);
  const [replyTarget, setReplyTarget] = useState(null);
  const [replyText, setReplyText]   = useState('');
  const [answerSearch, setAnswerSearch] = useState('');

  // ── Slots ────────────────────────────────────────────────────────────────────
  const [slots, setSlots] = useState([]);
  const [slotForm, setSlotForm] = useState({ day: '', startTime: '', endTime: '', fee: '', duration: '30' });

  // ── Consultations ────────────────────────────────────────────────────────────
  const [consultations, setConsultations]   = useState([]);
  const [consultFilter, setConsultFilter]   = useState('all');
  const [consultMessage, setConsultMessage] = useState({});
  const [meetLinks, setMeetLinks]           = useState({});

  // ── Lounge ───────────────────────────────────────────────────────────────────
  const [myPosts, setMyPosts]   = useState([]);
  const [showPostForm, setShowPostForm] = useState(false);
  const [newPost, setNewPost]   = useState({ title: '', description: '', category: 'General Medicine' });

  // ── Chat Requests ────────────────────────────────────────────────────────────
  const [chatRequests, setChatRequests] = useState([]);

  // ── Loading / errors ─────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');

  const isDoctor = user?.role === 'doctor';

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/auth/doctor-stats');
      setStats(data);
    } catch {}
  }, []);

  const fetchQuestions = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/questions', { params: { status: 'open', limit: 50 } });
      setQuestions(data.questions || []);
    } catch {}
  }, []);

  const fetchSlots = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/slots/my');
      setSlots(data || []);
    } catch {}
  }, []);

  const fetchConsultations = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/consultations/doctor');
      setConsultations(data || []);
    } catch {}
  }, []);

  const fetchMyPosts = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/lounge/my');
      setMyPosts(data.posts || []);
    } catch {}
  }, []);

  const fetchChatRequests = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/chats/doctor-requests');
      setChatRequests(Array.isArray(data) ? data : (data.requests || []));
    } catch {}
  }, []);

  useEffect(() => {
    if (!user?.verified) return;
    fetchStats();
    if (activeTab === 'questions')     fetchQuestions();
    if (activeTab === 'slots')         fetchSlots();
    if (activeTab === 'consultations') fetchConsultations();
    if (activeTab === 'lounge')        fetchMyPosts();
    if (activeTab === 'chats')         fetchChatRequests();
    if (activeTab === 'dashboard') {
      fetchQuestions();
      if (isDoctor) {
        fetchConsultations();
        fetchSlots();
      }
      fetchMyPosts();
    }
  }, [activeTab, user]);

  useEffect(() => {
    if (replyToId && user?.verified) {
      axios.get(`/api/questions/${replyToId}`).then(({ data }) => {
        setReplyTarget(data);
        setActiveTab('questions');
      }).catch(() => {});
    }
  }, [replyToId, user]);

  // ── Answer Actions ───────────────────────────────────────────────────────────
  const submitReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    try {
      setLoading(true);
      await axios.post('/api/answers', { questionId: replyTarget._id, text: replyText });
      setSubmitMsg('✅ Answer submitted for moderation!');
      setReplyText(''); setReplyTarget(null);
      fetchStats();
      setTimeout(() => setSubmitMsg(''), 4000);
    } catch (err) {
      setSubmitMsg('❌ ' + (err.response?.data?.message || 'Failed to submit'));
    } finally { setLoading(false); }
  };

  // ── Slot Actions ─────────────────────────────────────────────────────────────
  const handleCreateSlot = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/slots', slotForm);
      setSlotForm({ day: '', startTime: '', endTime: '', fee: '', duration: '30' });
      fetchSlots();
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
  };

  const handleDeleteSlot = async (id) => {
    if (!confirm('Delete this slot?')) return;
    try { await axios.delete(`/api/slots/${id}`); fetchSlots(); } catch (err) { alert('Failed'); }
  };

  // ── Consultation Actions ──────────────────────────────────────────────────────
  const handleConsultAction = async (id, action) => {
    try {
      if (action === 'accept') {
        const ml = meetLinks[id];
        if (!ml) return alert('Please provide a Meet/Video link first');
        await axios.patch(`/api/consultations/${id}/accept`, { doctorMessage: consultMessage[id] || '', meetLink: ml });
      } else if (action === 'reject') {
        await axios.patch(`/api/consultations/${id}/reject`, { doctorMessage: consultMessage[id] || '' });
      } else if (action === 'complete') {
        await axios.patch(`/api/consultations/${id}/complete`);
      }
      setSubmitMsg(`✅ Consultation ${action}ed`);
      fetchConsultations(); fetchStats();
      setTimeout(() => setSubmitMsg(''), 3000);
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
  };

  // ── Lounge Post ───────────────────────────────────────────────────────────────
  const handleCreatePost = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/lounge', newPost);
      setNewPost({ title: '', description: '', category: 'General Medicine' });
      setShowPostForm(false);
      fetchMyPosts(); fetchStats();
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
  };

  // ── Chat Actions ──────────────────────────────────────────────────────────────
  const handleChatAction = async (id, action, note = '', fee = 0, day = '', time = '') => {
    try {
      if (action === 'propose') {
        await axios.patch(`/api/chats/${id}/propose`, { proposedDay: day, proposedTime: time, fee, doctorNote: note });
      } else if (action === 'reject') {
        await axios.patch(`/api/chats/${id}/reject`, { doctorNote: note });
      }
      fetchChatRequests();
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
  };

  const timeAgo = (d) => {
    const mins = Math.floor((Date.now() - new Date(d)) / 60000);
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    return `${Math.floor(mins / 1440)}d ago`;
  };

  // ── Unverified gate ───────────────────────────────────────────────────────────
  if (!user?.verified) {
    return (
      <div className="page-wrapper container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div style={{ background: 'white', borderRadius: '24px', padding: '60px 40px', textAlign: 'center', maxWidth: '540px', boxShadow: '0 20px 60px rgba(0,0,0,0.08)', border: '1px solid rgba(30,94,255,0.1)' }}>
          <div style={{ fontSize: '4rem', marginBottom: '24px' }}>⏳</div>
          <h2 style={{ marginBottom: '16px', color: '#0A2540' }}>Verification Pending</h2>
          <p style={{ color: '#64748b', lineHeight: 1.7, marginBottom: '32px' }}>
            Your credentials are under review by our admin team. You'll get full access to the dashboard once your account is verified.
          </p>
          <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '12px', padding: '16px', color: '#d97706', fontSize: '0.9rem' }}>
            📧 We will notify you at <strong>{user?.email}</strong> once verified.
          </div>
        </div>
      </div>
    );
  }

  const tabs = TAB_CONFIG.filter(t => !t.doctorOnly || isDoctor);
  const filteredConsultations = consultFilter === 'all' ? consultations : consultations.filter(c => c.status === consultFilter);
  const filteredQuestions = answerSearch
    ? questions.filter(q => q.title.toLowerCase().includes(answerSearch.toLowerCase()) || (q.description || '').toLowerCase().includes(answerSearch.toLowerCase()))
    : questions;

  return (
    <div className="page-wrapper" style={{ paddingTop: '150px', minHeight: '100vh', background: 'linear-gradient(145deg, #f8fafc 0%, #e8f0fe 100%)' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px 60px', display: 'flex', gap: '28px' }}>

        {/* ── SIDEBAR ─────────────────────────────────────────────────────────── */}
        <aside style={{
          width: '260px', flexShrink: 0, position: 'sticky', top: '160px', height: 'fit-content',
          display: window.innerWidth < 900 ? (sidebarOpen ? 'block' : 'none') : 'block'
        }}>
          {/* Profile card */}
          <div style={{ background: 'white', borderRadius: '20px', padding: '28px 20px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid rgba(30,94,255,0.08)', marginBottom: '16px', textAlign: 'center' }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg, #1E5EFF, #4facfe)',
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2rem', fontWeight: 900, margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(30,94,255,0.3)'
            }}>
              {user.name?.[0]?.toUpperCase()}
            </div>
            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem', marginBottom: '4px' }}>{user.name}</div>
            <div style={{ fontSize: '0.8rem', color: user.role === 'doctor' ? '#16a34a' : '#6366f1', fontWeight: 700, background: user.role === 'doctor' ? 'rgba(34,197,94,0.1)' : 'rgba(99,102,241,0.1)', padding: '3px 12px', borderRadius: '100px', display: 'inline-block', marginBottom: '8px' }}>
              {user.role === 'doctor' ? '✓ Verified Doctor' : '🎓 Med. Student'}
            </div>
            {user.specialty && <div style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '4px' }}>📍 {user.specialty}</div>}
            {user.institution && <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>{user.institution}</div>}
          </div>

          {/* Stats mini */}
          {stats && (
            <div style={{ background: 'white', borderRadius: '20px', padding: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid rgba(30,94,255,0.08)', marginBottom: '16px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quick Stats</div>
              {[
                { label: 'Answers', value: stats.answers.total, icon: '💬' },
                { label: 'Posts', value: stats.loungePosts, icon: '📝' },
                ...(isDoctor ? [
                  { label: 'Consultations', value: stats.consultations.total, icon: '🩺' },
                  { label: 'Patients', value: stats.patientCount, icon: '👥' },
                ] : []),
                { label: 'Rating', value: stats.rating ? `${stats.rating}★` : 'N/A', icon: '⭐' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '0.85rem', color: '#475569' }}>{s.icon} {s.label}</span>
                  <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>{s.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Nav tabs */}
          <div style={{ background: 'white', borderRadius: '20px', padding: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid rgba(30,94,255,0.08)' }}>
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => { setActiveTab(tab.key); setSidebarOpen(false); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px',
                  borderRadius: '12px', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '0.9rem', fontWeight: 600, marginBottom: '4px',
                  background: activeTab === tab.key ? 'linear-gradient(135deg, rgba(30,94,255,0.12), rgba(79,172,254,0.08))' : 'transparent',
                  color: activeTab === tab.key ? '#1E5EFF' : '#475569',
                  transition: 'all 0.2s ease',
                  borderLeft: activeTab === tab.key ? '3px solid #1E5EFF' : '3px solid transparent',
                }}>
                <span>{tab.icon}</span> {tab.label}
              </button>
            ))}
            <div style={{ height: '1px', background: '#f1f5f9', margin: '8px 0' }} />
            <Link to="/profile" style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px',
              borderRadius: '12px', color: '#64748b', fontSize: '0.9rem', fontWeight: 600, textDecoration: 'none',
            }}>
              <span>👤</span> My Profile
            </Link>
          </div>
        </aside>

        {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
        <main style={{ flex: 1, minWidth: 0 }}>
          {/* Header bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
            <div>
              <h2 style={{ margin: 0, color: '#0f172a', fontSize: 'clamp(1.4rem, 3vw, 2rem)' }}>
                {tabs.find(t => t.key === activeTab)?.icon} {tabs.find(t => t.key === activeTab)?.label}
              </h2>
              <div style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '4px' }}>
                {user.name}
              </div>
            </div>
            {submitMsg && (
              <div style={{ background: submitMsg.startsWith('✅') ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', color: submitMsg.startsWith('✅') ? '#16a34a' : '#dc2626', border: `1px solid ${submitMsg.startsWith('✅') ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, padding: '10px 18px', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 600 }}>
                {submitMsg}
              </div>
            )}
          </div>

          {/* ════════════ DASHBOARD ════════════ */}
          {activeTab === 'dashboard' && stats && (
            <div style={{ animation: 'fadeInUp 0.5s ease' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                <StatCard icon="💬" label="Total Answers" value={stats.answers.total} sub={`${stats.answers.approved} approved · ${stats.answers.pending} pending`} />
                <StatCard icon="📝" label="Lounge Posts" value={stats.loungePosts} accent="#7c3aed" />
                {isDoctor && <StatCard icon="🩺" label="Consultations" value={stats.consultations.total} sub={`${stats.consultations.pending} awaiting`} accent="#0891b2" />}
                {isDoctor && <StatCard icon="👥" label="Patients" value={stats.patientCount} accent="#16a34a" />}
                <StatCard icon="⭐" label="Rating" value={stats.rating || '—'} sub={`${stats.reviewCount} reviews`} accent="#f59e0b" />
              </div>

              {/* Pending action callouts */}
              {isDoctor && stats.consultations.pending > 0 && (
                <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '16px', padding: '20px 24px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 800, color: '#4f46e5', marginBottom: '4px' }}>📋 {stats.consultations.pending} Consultation{stats.consultations.pending > 1 ? 's' : ''} awaiting your response</div>
                    <div style={{ color: '#64748b', fontSize: '0.85rem' }}>Patients are waiting — please review and respond</div>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('consultations')}>Review →</button>
                </div>
              )}
              {stats.answers.pending > 0 && (
                <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '16px', padding: '20px 24px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 800, color: '#d97706', marginBottom: '4px' }}>💬 {stats.answers.pending} Answer{stats.answers.pending > 1 ? 's' : ''} pending moderation</div>
                    <div style={{ color: '#64748b', fontSize: '0.85rem' }}>Your submitted answers are being reviewed by admin</div>
                  </div>
                </div>
              )}

              {/* Recent questions */}
              <div style={{ background: 'white', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: '1px solid rgba(30,94,255,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>📬 Recent Patient Questions</h3>
                  <button className="btn btn-sm" style={{ background: 'rgba(30,94,255,0.08)', color: '#1E5EFF', border: 'none', borderRadius: '10px' }} onClick={() => setActiveTab('questions')}>View All →</button>
                </div>
                {questions.slice(0, 5).map(q => (
                  <div key={q._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '14px 0', borderBottom: '1px solid #f8fafc' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.95rem', marginBottom: '4px' }}>{q.title}</div>
                      <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{q.category} · {timeAgo(q.createdAt)}</div>
                    </div>
                    <button className="btn btn-primary btn-sm" style={{ marginLeft: '16px', flexShrink: 0 }} onClick={() => { setReplyTarget(q); setActiveTab('questions'); }}>Answer</button>
                  </div>
                ))}
                {questions.length === 0 && <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>No open questions right now</div>}
              </div>
            </div>
          )}

          {/* ════════════ ANSWER QUESTIONS ════════════ */}
          {activeTab === 'questions' && (
            <div style={{ animation: 'fadeInUp 0.5s ease' }}>
              {replyTarget ? (
                <div style={{ background: 'white', borderRadius: '20px', padding: '28px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setReplyTarget(null)} style={{ marginBottom: '20px' }}>← Back to Questions</button>
                  <div style={{ background: 'linear-gradient(135deg, rgba(30,94,255,0.06), rgba(79,172,254,0.04))', border: '1px solid rgba(30,94,255,0.12)', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                      <StatusBadge status={replyTarget.status} />
                      <span style={{ color: '#64748b', fontSize: '0.85rem' }}>📂 {replyTarget.category}</span>
                    </div>
                    <h3 style={{ color: '#0f172a', marginBottom: '10px' }}>{replyTarget.title}</h3>
                    <p style={{ color: '#475569', lineHeight: 1.6 }}>{replyTarget.description}</p>
                    {replyTarget.imageUrl && <img src={`http://localhost:5000${replyTarget.imageUrl}`} alt="Question attachment" style={{ marginTop: '16px', borderRadius: '12px', maxHeight: '200px', objectFit: 'cover' }} />}
                  </div>
                  <form onSubmit={submitReply}>
                    <div className="form-group">
                      <label>Your Professional Answer</label>
                      <textarea className="form-input" required style={{ minHeight: '200px', marginTop: '8px' }}
                        placeholder="Provide a detailed, evidence-based answer. Include relevant medical context. Avoid prescribing specific medications."
                        value={replyText} onChange={e => setReplyText(e.target.value)} />
                    </div>
                    <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px', color: '#d97706', fontSize: '0.85rem' }}>
                      ⚠️ Your answer will go through admin moderation before being published publicly.
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Submitting…' : '📤 Submit for Review'}</button>
                      <button type="button" className="btn btn-ghost" onClick={() => setReplyTarget(null)}>Cancel</button>
                    </div>
                  </form>
                </div>
              ) : (
                <div>
                  <div style={{ marginBottom: '20px' }}>
                    <input type="text" className="form-input" placeholder="🔍 Search questions by keyword…" value={answerSearch} onChange={e => setAnswerSearch(e.target.value)} style={{ maxWidth: '400px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {filteredQuestions.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', background: 'white', borderRadius: '20px' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎉</div>
                        <div style={{ fontWeight: 600 }}>No open questions right now. Check back later!</div>
                      </div>
                    ) : filteredQuestions.map(q => (
                      <div key={q._id} style={{ background: 'white', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: '1px solid rgba(30,94,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
                            <span style={{ background: 'rgba(30,94,255,0.08)', color: '#1E5EFF', padding: '3px 12px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700 }}>{q.category}</span>
                            <StatusBadge status={q.status} />
                          </div>
                          <h3 style={{ color: '#0f172a', fontSize: '1.05rem', marginBottom: '8px' }}>{q.title}</h3>
                          <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{q.description}</p>
                          <div style={{ marginTop: '10px', color: '#94a3b8', fontSize: '0.8rem' }}>
                            Asked by {q.user?.name || 'User'} · {timeAgo(q.createdAt)} · 💬 {q.answersCount || 0} answers
                          </div>
                        </div>
                        <button className="btn btn-primary btn-sm" style={{ flexShrink: 0 }} onClick={() => { setReplyTarget(q); setAnswerSearch(''); }}>Answer</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════════════ DOCTOR'S LOUNGE ════════════ */}
          {activeTab === 'lounge' && (
            <div style={{ animation: 'fadeInUp 0.5s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <p style={{ color: '#64748b' }}>Your discussions in the Doctor's Lounge & Student Hub</p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn btn-primary btn-sm" onClick={() => setShowPostForm(p => !p)}>
                    {showPostForm ? '✕ Cancel' : '+ New Discussion'}
                  </button>
                  <Link to="/lounge" className="btn btn-ghost btn-sm">View All Lounge →</Link>
                </div>
              </div>

              {showPostForm && (
                <div style={{ background: 'white', borderRadius: '20px', padding: '24px', marginBottom: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid rgba(30,94,255,0.1)' }}>
                  <h3 style={{ marginBottom: '20px' }}>Start a New Discussion</h3>
                  <form onSubmit={handleCreatePost} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '16px' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Category</label>
                        <select className="form-input" value={newPost.category} onChange={e => setNewPost({ ...newPost, category: e.target.value })}>
                          {LOUNGE_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Title / Subject</label>
                        <input type="text" className="form-input" required placeholder="E.g. CGRP inhibitors for migraine — anyone tried?" value={newPost.title} onChange={e => setNewPost({ ...newPost, title: e.target.value })} />
                      </div>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Discussion Details</label>
                      <textarea className="form-input" rows={4} required placeholder="Share your clinical question, interesting case study, or seek peer advice…" value={newPost.description} onChange={e => setNewPost({ ...newPost, description: e.target.value })} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowPostForm(false)}>Cancel</button>
                      <button type="submit" className="btn btn-primary btn-sm">📤 Post Discussion</button>
                    </div>
                  </form>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {myPosts.length === 0 ? (
                  <div style={{ background: 'white', borderRadius: '20px', padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📭</div>
                    <div style={{ fontWeight: 600 }}>You haven't posted any discussions yet.</div>
                    <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={() => setShowPostForm(true)}>Start Your First Discussion</button>
                  </div>
                ) : myPosts.map(p => (
                  <Link to={`/lounge/${p._id}`} key={p._id} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ background: 'white', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: '1px solid rgba(30,94,255,0.06)', transition: 'transform 0.2s' }} className="hover-lift">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <span style={{ background: 'rgba(124,58,237,0.1)', color: '#7c3aed', padding: '4px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700 }}>{p.category}</span>
                        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{timeAgo(p.createdAt)}</span>
                      </div>
                      <h3 style={{ color: '#0f172a', marginBottom: '8px', fontSize: '1.05rem' }}>{p.title}</h3>
                      <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.description}</p>
                      <div style={{ display: 'flex', gap: '16px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f8fafc' }}>
                        <span style={{ color: '#64748b', fontSize: '0.85rem' }}>▲ {p.upvotes?.length || 0} upvotes</span>
                        <span style={{ color: '#64748b', fontSize: '0.85rem' }}>💬 {p.repliesCount || 0} replies</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ════════════ SLOTS (Doctor only) ════════════ */}
          {activeTab === 'slots' && isDoctor && (
            <div style={{ animation: 'fadeInUp 0.5s ease' }}>
              <div style={{ background: 'white', borderRadius: '20px', padding: '28px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', marginBottom: '24px' }}>
                <h3 style={{ marginBottom: '20px', color: '#0f172a' }}>➕ Add New Availability Slot</h3>
                <form onSubmit={handleCreateSlot} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', alignItems: 'end' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Day / Date</label>
                    <input type="text" className="form-input" required placeholder="e.g. Monday" value={slotForm.day} onChange={e => setSlotForm({ ...slotForm, day: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Start Time</label>
                    <input type="time" className="form-input" required value={slotForm.startTime} onChange={e => setSlotForm({ ...slotForm, startTime: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>End Time</label>
                    <input type="time" className="form-input" required value={slotForm.endTime} onChange={e => setSlotForm({ ...slotForm, endTime: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Fee (₹)</label>
                    <input type="number" className="form-input" required min="0" value={slotForm.fee} onChange={e => setSlotForm({ ...slotForm, fee: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Duration (min)</label>
                    <select className="form-input" value={slotForm.duration} onChange={e => setSlotForm({ ...slotForm, duration: e.target.value })}>
                      <option value="15">15 min</option>
                      <option value="30">30 min</option>
                      <option value="45">45 min</option>
                      <option value="60">60 min</option>
                    </select>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-end, height: fit-content' }}>Add Slot</button>
                </form>
              </div>

              <div style={{ background: 'white', borderRadius: '20px', padding: '28px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                <h3 style={{ marginBottom: '20px', color: '#0f172a' }}>📅 Your Availability Slots</h3>
                {slots.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>No slots added yet. Add one above!</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
                    {slots.map(s => (
                      <div key={s._id} style={{ background: s.isBooked ? 'rgba(239,68,68,0.04)' : 'rgba(30,94,255,0.03)', border: `1px solid ${s.isBooked ? 'rgba(239,68,68,0.2)' : 'rgba(30,94,255,0.12)'}`, borderRadius: '16px', padding: '20px', position: 'relative' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '6px', fontSize: '1.05rem' }}>{s.day}</div>
                        <div style={{ color: '#475569', fontSize: '0.9rem', marginBottom: '4px' }}>🕐 {s.startTime} — {s.endTime}</div>
                        <div style={{ color: '#1E5EFF', fontWeight: 700, fontSize: '0.9rem', marginBottom: '4px' }}>₹{s.fee}</div>
                        <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '12px' }}>⏱ {s.duration} min</div>
                        {s.isBooked
                          ? <span style={{ background: 'rgba(239,68,68,0.1)', color: '#dc2626', padding: '3px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>🔒 Booked</span>
                          : <span style={{ background: 'rgba(34,197,94,0.1)', color: '#16a34a', padding: '3px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>✓ Available</span>
                        }
                        {!s.isBooked && (
                          <button onClick={() => handleDeleteSlot(s._id)} style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(239,68,68,0.08)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '4px 10px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>Delete</button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════════════ CONSULTATIONS (Doctor only) ════════════ */}
          {activeTab === 'consultations' && isDoctor && (
            <div style={{ animation: 'fadeInUp 0.5s ease' }}>
              {/* Filter tabs */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
                {['all', 'payment_done', 'accepted', 'completed', 'rejected'].map(f => (
                  <button key={f} onClick={() => setConsultFilter(f)}
                    style={{ padding: '8px 18px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', background: consultFilter === f ? '#1E5EFF' : 'white', color: consultFilter === f ? 'white' : '#475569', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    {f === 'all' ? 'All' : f.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    {f !== 'all' && <span style={{ marginLeft: '6px', background: 'rgba(255,255,255,0.2)', padding: '1px 6px', borderRadius: '4px', fontSize: '0.75rem' }}>{consultations.filter(c => c.status === f).length}</span>}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {filteredConsultations.length === 0 ? (
                  <div style={{ background: 'white', borderRadius: '20px', padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📋</div>
                    <div style={{ fontWeight: 600 }}>No {consultFilter !== 'all' ? consultFilter.replace(/_/g, ' ') : ''} consultations</div>
                  </div>
                ) : filteredConsultations.map(c => (
                  <div key={c._id} style={{ background: 'white', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: '1px solid rgba(30,94,255,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #1E5EFF, #4facfe)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>
                            {c.patient?.name?.[0]?.toUpperCase() || 'P'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, color: '#0f172a' }}>{c.patient?.name || 'Patient'}</div>
                            <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{c.patient?.email}</div>
                          </div>
                        </div>
                        <div style={{ color: '#64748b', fontSize: '0.85rem' }}>📅 {c.slotDay} at {c.slotTime} · ₹{c.fee}</div>
                      </div>
                      <StatusBadge status={c.status} />
                    </div>

                    {c.symptoms && (
                      <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px', marginBottom: '16px', borderLeft: '3px solid #1E5EFF' }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Patient's Symptoms</div>
                        <div style={{ color: '#0f172a', fontSize: '0.9rem' }}>{c.symptoms}</div>
                      </div>
                    )}

                    {c.status === 'payment_done' && (
                      <div style={{ background: 'rgba(99,102,241,0.06)', borderRadius: '14px', padding: '18px', border: '1px solid rgba(99,102,241,0.15)' }}>
                        <div style={{ fontWeight: 700, color: '#4f46e5', marginBottom: '14px' }}>💡 Payment confirmed — your response needed</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Message to Patient</label>
                            <input type="text" className="form-input" placeholder="Appointment confirmed. See you soon." value={consultMessage[c._id] || ''} onChange={e => setConsultMessage(prev => ({ ...prev, [c._id]: e.target.value }))} />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Video Call Link *</label>
                            <input type="url" className="form-input" placeholder="https://meet.google.com/…" value={meetLinks[c._id] || ''} onChange={e => setMeetLinks(prev => ({ ...prev, [c._id]: e.target.value }))} />
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button className="btn btn-primary btn-sm" onClick={() => handleConsultAction(c._id, 'accept')}>✓ Accept</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleConsultAction(c._id, 'reject')}>✕ Reject</button>
                        </div>
                      </div>
                    )}

                    {c.status === 'accepted' && (
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        {c.meetLink && <a href={c.meetLink} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">🎥 Join Call</a>}
                        <button className="btn btn-sm" style={{ background: 'rgba(34,197,94,0.1)', color: '#16a34a', border: '1px solid rgba(34,197,94,0.25)' }} onClick={() => handleConsultAction(c._id, 'complete')}>✓ Mark Completed</button>
                      </div>
                    )}

                    {c.status === 'completed' && c.meetLink && (
                      <div style={{ color: '#16a34a', fontSize: '0.85rem', fontWeight: 600 }}>✅ Session completed</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ════════════ PRIVATE CHATS ════════════ */}
          {activeTab === 'chats' && (
            <div style={{ animation: 'fadeInUp 0.5s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <p style={{ color: '#64748b' }}>Manage incoming private chat requests from patients</p>
                <Link to="/private-chats" className="btn btn-primary btn-sm">Open Full Chat →</Link>
              </div>
              {chatRequests.length === 0 ? (
                <div style={{ background: 'white', borderRadius: '20px', padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '16px' }}>💬</div>
                  <div style={{ fontWeight: 600 }}>No chat requests yet</div>
                  <div style={{ fontSize: '0.9rem', marginTop: '8px' }}>When patients request a private session with you, they'll appear here.</div>
                </div>
              ) : chatRequests.map(r => (
                <div key={r._id} style={{ background: 'white', borderRadius: '20px', padding: '24px', marginBottom: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: '1px solid rgba(30,94,255,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>Request from {r.patient?.name || 'Patient'}</div>
                      <div style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '8px' }}>Preferred: {r.preferredDay} at {r.preferredTime}</div>
                      {r.concern && <div style={{ color: '#475569', fontSize: '0.9rem', background: '#f8fafc', padding: '10px 14px', borderRadius: '10px', maxWidth: '500px' }}>{r.concern}</div>}
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                  <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
                    <Link to="/private-chats" className="btn btn-primary btn-sm">Manage Request →</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      <style>{`
        .hover-lift:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(0,0,0,0.08) !important; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
