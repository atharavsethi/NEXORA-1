import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function LoungePostDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  
  const [post, setPost] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [newReply, setNewReply] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPostData();
  }, [id]);

  const fetchPostData = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`/api/lounge/${id}`);
      setPost(data.post);
      setReplies(data.replies);
    } catch (err) {
      console.error(err);
      setError('Failed to load post.');
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!newReply.trim()) return;
    setSubmitting(true);
    try {
      const { data } = await axios.post(`/api/lounge/${id}/reply`, { text: newReply });
      setReplies([...replies, data]);
      setNewReply('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit reply');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpvote = async () => {
    if (!user) return alert('Login to upvote');
    try {
      const { data } = await axios.post(`/api/lounge/${id}/upvote`);
      setPost(data);
    } catch (err) {
      console.error(err);
    }
  };

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    return `${Math.floor(mins / 1440)}d ago`;
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '100px' }}><div className="spinner" /></div>;
  if (!post) return <div style={{ textAlign: 'center', padding: '100px', fontSize: '1.2rem', color: '#64748b' }}>Post not found or deleted.</div>;

  const hasUpvoted = user && post.upvotes?.includes(user._id);

  return (
    <div className="page-wrapper container" style={{ maxWidth: '800px', paddingBottom: '80px', fontFamily: "'Inter', sans-serif" }}>
      
      <div style={{ marginBottom: '24px', paddingTop: '20px' }}>
        <Link to="/lounge" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          ← Back to Lounge
        </Link>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '20px' }}>{error}</div>}

      {/* Main Post Card */}
      <div style={{ 
        background: 'white', borderRadius: '20px', padding: '32px', border: '1px solid #f1f5f9',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)', marginBottom: '32px'
      }}>
        {/* Post Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ 
              width: '56px', height: '56px', borderRadius: '16px', background: 'var(--primary)', 
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800 
            }}>
              {post.author?.name?.[0]?.toUpperCase() || 'D'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.2rem' }}>{post.author?.name || 'Unknown Author'}</span>
                {post.authorRole === 'doctor' && <span style={{ color: 'var(--primary)', fontSize: '1.2rem' }}>✓</span>}
              </div>
              <div style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600, marginTop: '2px' }}>
                {post.authorRole === 'doctor' ? 'Verified Doctor' : 'Medical Student'} · {post.author?.specialty || ''} · {timeAgo(post.createdAt)}
              </div>
            </div>
          </div>
          <div style={{ background: '#f3e8ff', color: '#7e22ce', padding: '6px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700 }}>
            {post.category}
          </div>
        </div>

        <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', marginBottom: '16px', lineHeight: '1.3' }}>
          {post.title}
        </h1>
        <p style={{ color: '#334155', fontSize: '1.1rem', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
          {post.description}
        </p>

        <div style={{ display: 'flex', gap: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '24px', marginTop: '32px' }}>
          <button 
            onClick={handleUpvote}
            style={{ 
              background: hasUpvoted ? 'rgba(30, 94, 255, 0.1)' : '#f8fafc', 
              border: `1px solid ${hasUpvoted ? 'var(--primary)' : '#e2e8f0'}`, 
              color: hasUpvoted ? 'var(--primary-dark)' : '#475569',
              padding: '10px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>▲</span> {post.upvotes?.length || 0}
          </button>
        </div>
      </div>

      {/* Replies Section */}
      <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: '24px' }}>
        Discussion ({replies.length})
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '40px' }}>
        {replies.length === 0 ? (
          <div style={{ background: '#f8fafc', padding: '32px', borderRadius: '16px', textAlign: 'center', color: '#64748b', border: '1px dashed #cbd5e1' }}>
            No comments yet. Be the first to start the discussion!
          </div>
        ) : (
          replies.map(reply => (
            <div key={reply._id} style={{ display: 'flex', gap: '16px' }}>
              <div style={{ 
                width: '40px', height: '40px', borderRadius: '50%', background: reply.author?.role === 'doctor' ? 'var(--primary)' : '#e2e8f0', 
                color: reply.author?.role === 'doctor' ? 'white' : '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0
              }}>
                {reply.author?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div>
                    <span style={{ fontWeight: 700, color: '#0f172a', marginRight: '6px' }}>{reply.author?.name || 'User'}</span>
                    {reply.author?.role === 'doctor' && <span style={{ color: 'var(--primary)', fontSize: '0.9rem', marginRight: '6px' }}>✓</span>}
                    {reply.author?.role !== 'user' && (
                      <span style={{ fontSize: '0.8rem', color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                        {reply.author?.role}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{timeAgo(reply.createdAt)}</span>
                </div>
                <p style={{ color: '#334155', fontSize: '0.95rem', lineHeight: '1.6', margin: 0 }}>
                  {reply.text}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Reply Box */}
      {user ? (
        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <h4 style={{ marginBottom: '16px', color: '#0f172a' }}>Add your perspective</h4>
          <form onSubmit={handleReply}>
            <textarea 
              value={newReply}
              onChange={e => setNewReply(e.target.value)}
              placeholder="Write a thoughtful comment..."
              required
              rows="4"
              style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', resize: 'vertical', fontSize: '1rem', boxSizing: 'border-box', marginBottom: '16px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
              <button disabled={submitting} className="btn btn-primary" type="submit" style={{ borderRadius: '100px', padding: '10px 24px' }}>
                {submitting ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '16px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
          <p style={{ color: '#475569', marginBottom: '16px' }}>You must be logged in to participate in the lounge discussions.</p>
          <Link to="/login" className="btn btn-primary" style={{ borderRadius: '100px' }}>Log In</Link>
        </div>
      )}

    </div>
  );
}
