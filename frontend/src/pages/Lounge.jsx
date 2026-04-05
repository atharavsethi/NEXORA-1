import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = ['All', 'General Medicine', 'Neurology', 'Endocrinology', 'Pediatrics', 'Cardiology', 'Dermatology'];

export default function Lounge() {
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState('doctor'); // 'doctor' or 'student'
  const [category, setCategory] = useState('All');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // For asking
  const [showAskForm, setShowAskForm] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', description: '', category: 'General Medicine' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPosts();
  }, [category, activeTab]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const qParams = { authorRole: activeTab };
      if (category !== 'All') qParams.category = category;
      
      const { data } = await axios.get('/api/lounge', { params: qParams });
      setPosts(data.posts || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPost.title || !newPost.description) {
      setError('Title and description are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const { data } = await axios.post('/api/lounge', newPost);
      setPosts([data, ...posts]);
      setShowAskForm(false);
      setNewPost({ title: '', description: '', category: 'General Medicine' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    return `${Math.floor(mins / 1440)}d ago`;
  };

  const canPost = user && (user.role === 'doctor' || user.role === 'student');

  return (
    <div className="page-wrapper container" style={{ maxWidth: '960px', paddingBottom: '80px', fontFamily: "'Inter', sans-serif" }}>

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '32px', paddingTop: '20px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(30, 94, 255, 0.08)', color: 'var(--primary)', padding: '6px 14px', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 800, marginBottom: '20px', letterSpacing: '0.5px' }}>
          🏥 MEDICAL COMMUNITY
        </div>
        <h1 style={{ fontSize: '2.8rem', fontWeight: 900, color: '#1e293b', marginBottom: '16px', letterSpacing: '-0.5px' }}>
          Doctor's <span style={{ color: 'var(--primary)' }}>Lounge</span> & Student Hub
        </h1>
        <p style={{ color: '#64748b', fontSize: '1.1rem', maxWidth: '700px', lineHeight: '1.6' }}>
          A secure space for verified medical professionals and approved students to collaborate.
        </p>
      </div>

      {/* ── Banner and Tabs Row ────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', marginBottom: '40px' }}>
        
        {/* Info Banner */}
        <div style={{ 
          background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '16px', padding: '24px', width: 'fit-content'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b45309', fontWeight: 700, marginBottom: '8px' }}>
            <span>🔒</span> Doctors Can Post in Lounge
          </div>
          <Link to="/forum" style={{ color: '#d97706', fontWeight: 700, fontSize: '0.95rem', textDecoration: 'none' }}>
            Patients: Ask a Question →
          </Link>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '24px', borderBottom: '2px solid #f1f5f9' }}>
          <button 
            onClick={() => setActiveTab('doctor')}
            style={{ 
              background: 'none', border: 'none', padding: '0 0 12px 0', fontSize: '1.05rem', fontWeight: 700, cursor: 'pointer',
              color: activeTab === 'doctor' ? 'var(--primary)' : '#64748b',
              borderBottom: activeTab === 'doctor' ? '3px solid var(--primary)' : '3px solid transparent',
              marginBottom: '-2px', display: 'flex', alignItems: 'center', gap: '8px'
            }}
          >
            <span>👨‍⚕️</span> Doctor's Lounge
          </button>
          <button 
            onClick={() => setActiveTab('student')}
            style={{ 
              background: activeTab === 'student' ? '#f8fafc' : 'none', border: 'none', padding: '8px 16px', borderRadius: '12px', fontSize: '1.05rem', fontWeight: 700, cursor: 'pointer',
              color: activeTab === 'student' ? '#334155' : '#64748b',
              borderBottom: '3px solid transparent', // to align vertically
              marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px'
            }}
          >
            <span>🎓</span> Medical Students
          </button>
        </div>

      </div>

      {/* ── Create Post Button (If allowed) ──────────────────────────────────────── */}
      {canPost && !showAskForm && (
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={() => setShowAskForm(true)}>+ New Discussion</button>
        </div>
      )}

      {/* ── Ask Form ──────────────────────────────────────────────────────────── */}
      {showAskForm && (
        <div className="glass-card" style={{ padding: '24px', marginBottom: '32px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginBottom: '16px' }}>Start a New Discussion in {activeTab === 'doctor' ? "Doctor's Lounge" : "Student Hub"}</h3>
          {error && <div className="alert alert-error" style={{ marginBottom: '16px' }}>{error}</div>}
          <form onSubmit={handleCreatePost} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '16px' }}>
              <select className="form-input" value={newPost.category} onChange={e => setNewPost({...newPost, category: e.target.value})} style={{ width: '200px' }}>
                {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="text" className="form-input" placeholder="Title/Subject of discussion" value={newPost.title} onChange={e => setNewPost({...newPost, title: e.target.value})} style={{ flex: 1 }} required />
            </div>
            <textarea className="form-input" rows="4" placeholder="Share your clinical question, interesting case, or seek advice..." value={newPost.description} onChange={e => setNewPost({...newPost, description: e.target.value})} required />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowAskForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Posting...' : 'Post Discussion'}</button>
            </div>
          </form>
        </div>
      )}

      {/* ── Category Filters ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '16px', marginBottom: '30px' }} className="hide-scroll">
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCategory(c)}
            style={{ 
              background: category === c ? 'var(--primary)' : 'white',
              color: category === c ? 'white' : '#475569',
              border: `1px solid ${category === c ? 'var(--primary)' : '#cbd5e1'}`,
              padding: '8px 20px', borderRadius: '100px', fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap', cursor: 'pointer',
              boxShadow: category === c ? '0 4px 10px rgba(30, 94, 255, 0.2)' : 'none',
              transition: 'all 0.2s ease'
            }}>
            {c}
          </button>
        ))}
      </div>

      {/* ── Post Feed ─────────────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" /></div>
      ) : posts.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📭</div>
          <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>No discussions found for this category.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {posts.map(post => (
            <Link to={`/lounge/${post._id}`} key={post._id} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ 
                background: 'white', borderRadius: '20px', padding: '32px', border: '1px solid #f1f5f9',
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)', transition: 'transform 0.2s', cursor: 'pointer'
              }} className="hover-lift">
                
                {/* Post Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ 
                      width: '48px', height: '48px', borderRadius: '12px', background: 'var(--primary)', 
                      color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 800 
                    }}>
                      {post.author?.name?.[0]?.toUpperCase() || 'D'}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.05rem' }}>{post.author?.name || 'Unknown Author'}</span>
                        {post.authorRole === 'doctor' && <span style={{ color: 'var(--primary)', fontSize: '1.1rem' }}>✓</span>}
                      </div>
                      <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600, marginTop: '2px' }}>
                        {post.authorRole === 'doctor' ? 'Verified Doctor' : 'Medical Student'} · {timeAgo(post.createdAt)}
                      </div>
                    </div>
                  </div>

                  <div style={{ 
                    background: '#f3e8ff', color: '#7e22ce', padding: '6px 14px', 
                    borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700 
                  }}>
                    {post.category}
                  </div>
                </div>

                {/* Post Content */}
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: '12px', lineHeight: '1.4' }}>
                  {post.title}
                </h2>
                <p style={{ color: '#475569', fontSize: '1rem', lineHeight: '1.6', marginBottom: '24px', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {post.description}
                </p>

                {/* Post Footer */}
                <div style={{ display: 'flex', gap: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                  <button style={{ 
                    background: '#f8fafc', border: '1px solid #e2e8f0', padding: '8px 16px', borderRadius: '10px',
                    display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#475569', cursor: 'pointer' 
                  }}>
                    <span style={{ fontSize: '1.1rem' }}>▲</span> {post.upvotes?.length || 0}
                  </button>
                  <button style={{ 
                    background: '#f8fafc', border: '1px solid #e2e8f0', padding: '8px 16px', borderRadius: '10px',
                    display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#475569', cursor: 'pointer' 
                  }}>
                    <span style={{ fontSize: '1.1rem' }}>💬</span> {post.repliesCount || 0} Replies
                  </button>
                </div>

              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Added hover-lift css inline for simple inclusion */}
      <style>{`
        .hover-lift:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(0,0,0,0.06) !important;
        }
      `}</style>
    </div>
  );
}
