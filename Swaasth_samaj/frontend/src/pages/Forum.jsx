import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = ['All', 'General Medicine', 'Nutrition & Diet', 'Mental Health', 'Pediatrics', 'Cardiology', 'Dermatology', "Women's Health", 'Emergency', 'Dental', 'Other'];

export default function Forum() {
  const { user } = useAuth();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const initialTab = params.get('tab') === 'chats' ? 'chats' : 'questions';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [questions, setQuestions] = useState([]);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeTab === 'questions') fetchQuestions();
  }, [category, search, activeTab]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const qParams = {};
      if (category !== 'All') qParams.category = category;
      if (search) qParams.search = search;
      const { data } = await axios.get('/api/questions', { params: qParams });
      setQuestions(data.questions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    return `${Math.floor(mins / 1440)}d ago`;
  };

  return (
    <div className="page-wrapper container" style={{ maxWidth: '900px', paddingBottom: '60px', paddingTop: '150px' }}>

      {/* ── Top header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ marginBottom: '6px' }}>Community Forum</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Ask health questions or request a private chat with a verified doctor.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {activeTab === 'questions' && (
            user ? (
              <Link to="/ask" className="btn btn-primary">✏️ Ask a Question</Link>
            ) : (
              <Link to="/login" className="btn btn-primary">Login to Ask</Link>
            )
          )}
          {activeTab === 'chats' && user && (
            <Link to="/private-chats" className="btn btn-primary">🔒 My Private Chats</Link>
          )}
        </div>
      </div>

      {/* ── Tab switcher ──────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: '4px', background: 'var(--bg-light)', padding: '6px',
        borderRadius: 'var(--radius-md)', marginBottom: '28px', width: 'fit-content',
      }}>
        {[
          { key: 'questions', icon: '💬', label: 'Community Q&A' },
          { key: 'chats',     icon: '🔒', label: 'Private Doctor Chats' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`btn btn-sm ${activeTab === tab.key ? 'btn-primary' : 'btn-ghost'}`}
            style={{ borderRadius: 'var(--radius-sm)', fontWeight: 600, padding: '8px 18px' }}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ══ QUESTIONS TAB ══════════════════════════════════════════════════════ */}
      {activeTab === 'questions' && (
        <>
          {/* Search */}
          <div style={{ marginBottom: '16px' }}>
            <input type="text" className="form-input" placeholder="🔍 Search questions..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', borderRadius: '100px' }} />
          </div>

          {/* Category filters */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '16px', marginBottom: '20px' }} className="hide-scroll">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className={`btn btn-sm ${category === c ? 'btn-primary' : 'btn-ghost'}`}
                style={{ borderRadius: '100px', whiteSpace: 'nowrap' }}>
                {c}
              </button>
            ))}
          </div>

          {/* Guest notice */}
          {!user && (
            <div className="alert alert-warning" style={{ marginBottom: '24px' }}>
              💡 <strong>Login</strong> to post questions. Only verified doctors & medical students can answer.
            </div>
          )}

          {/* Question list */}
          {loading ? (
            <div className="spinner" />
          ) : questions.length === 0 ? (
            <div className="empty-state glass-card">
              <div className="icon">🗒️</div>
              <p>No questions found. {user ? <Link to="/ask">Ask the first one!</Link> : 'Login to ask.'}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {questions.map(q => (
                <Link to={`/forum/${q._id}`} key={q._id} style={{ textDecoration: 'none' }}>
                  <div className="glass-card" style={{ padding: '22px 24px', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                      <span className="category-badge">{q.category}</span>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span className={`status-badge status-${q.answersCount > 0 ? 'answered' : 'pending'}`}>
                          {q.answersCount > 0 ? `✅ ${q.answersCount} Answered` : '⏳ Awaiting Answer'}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{timeAgo(q.createdAt)}</span>
                      </div>
                    </div>
                    <h3 style={{ fontSize: '1.05rem', marginBottom: '8px', color: 'var(--secondary)' }}>{q.title}</h3>
                    {q.description && (
                      <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '12px' }}>
                        {q.description.length > 150 ? q.description.slice(0, 150) + '...' : q.description}
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {q.user && <span>👤 {q.user.name}</span>}
                      <span>👁 {q.views || 0} views</span>
                      <span>💬 {q.answersCount || 0} answers</span>
                      <span>⬆️ {(q.upvotes || []).length}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {/* ══ PRIVATE CHATS TAB ══════════════════════════════════════════════════ */}
      {activeTab === 'chats' && (
        <div>
          {!user ? (
            <div className="glass-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔒</div>
              <h3>Login Required</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>You need to be logged in to access private doctor consultations.</p>
              <Link to="/login" className="btn btn-primary">Login Now</Link>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '20px' }}>💬</div>
              <h3 style={{ marginBottom: '12px' }}>Private Chat with Doctors</h3>
              <p style={{ color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto 32px', lineHeight: 1.7 }}>
                Request a secure, one-on-one consultation with a verified doctor. The doctor will propose a time slot and fee. 
                After payment, your private chat room opens.
              </p>

              {/* Feature cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', maxWidth: '700px', margin: '0 auto 36px', textAlign: 'left' }}>
                {[
                  { icon: '🔒', title: 'Private & Secure', desc: 'Your conversation is visible only to you and the doctor. Completely confidential.' },
                  { icon: '⏱', title: 'Doctor Sets the Slot', desc: 'The doctor reviews your concern and proposes a convenient time and fee.' },
                  { icon: '💳', title: 'Pay Only After Approval', desc: 'No charge until the doctor accepts and proposes a slot you agree with.' },
                ].map(f => (
                  <div key={f.title} className="glass-card" style={{ padding: '20px' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '10px' }}>{f.icon}</div>
                    <h4 style={{ marginBottom: '6px', fontSize: '0.95rem' }}>{f.title}</h4>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>{f.desc}</p>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link to="/private-chats" className="btn btn-primary" style={{ padding: '14px 32px', fontSize: '1rem' }}>
                  🔒 View / Start Private Chats
                </Link>
                <Link to="/doctors" className="btn btn-ghost" style={{ padding: '14px 32px', fontSize: '1rem' }}>
                  Browse Doctors First
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
