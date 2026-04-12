import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import AnswerCard from '../components/AnswerCard';
import VerifiedBadge from '../components/VerifiedBadge';

export default function QuestionDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [question, setQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newAnswer, setNewAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [{ data: q }, { data: a }] = await Promise.all([
        axios.get(`/api/questions/${id}`),
        axios.get(`/api/answers/question/${id}`)
      ]);
      setQuestion(q);
      setAnswers(a);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpvote = async () => {
    if (!user) return alert('Please login to upvote');
    try {
      const { data } = await axios.put(`/api/questions/${id}/upvote`);
      setQuestion({ ...question, upvotes: { length: data.upvotes } });
    } catch (err) {
      console.error(err);
    }
  };

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!newAnswer.trim()) return;
    setSubmitting(true);
    try {
      await axios.post('/api/answers', { questionId: id, text: newAnswer });
      setNewAnswer('');
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to post reply');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="page-wrapper"><div className="spinner" /></div>;
  if (!question) return <div className="page-wrapper container"><div className="alert alert-error">Question not found</div></div>;

  const isVerifiedPro = user?.role === 'doctor' || user?.role === 'student';

  return (
    <div className="page-wrapper container" style={{ padding: '150px 20px 40px', maxWidth: '800px' }}>
      <Link to="/forum" className="btn btn-ghost btn-sm" style={{ marginBottom: '20px' }}>← Back to Forum</Link>
      
      {/* Question Section */}
      <div className="glass-card" style={{ padding: '30px', marginBottom: '40px', borderTop: '4px solid var(--teal)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <span className="category-badge">{question.category}</span>
          <span className={`status-badge status-${question.status}`}>
            {question.status === 'pending' ? '⏳ Pending' : question.status === 'answered' ? '✔ Answered' : '🔒 Closed'}
          </span>
        </div>
        
        <h1 style={{ marginBottom: '20px', fontSize: '2rem' }}>{question.title}</h1>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '20px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--navy-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
            {question.userId?.name?.[0]}
          </div>
          <div>
            <div style={{ fontWeight: '500' }}>{question.userId?.name}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {new Date(question.createdAt).toLocaleDateString()} • {question.views} views
            </div>
          </div>
        </div>

        <div style={{ fontSize: '1.1rem', lineHeight: '1.8', whiteSpace: 'pre-wrap', marginBottom: '30px' }}>
          {question.description}
        </div>

        {question.imageUrl && (
          <img src={`http://localhost:5000${question.imageUrl}`} alt="Attachment" style={{ borderRadius: 'var(--radius-md)', marginBottom: '30px', maxHeight: '400px', objectFit: 'contain' }} />
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="btn btn-ghost" onClick={handleUpvote}>
            ▲ Upvote ({question.upvotes?.length || 0})
          </button>
        </div>
      </div>
      
      {/* Inline Reply Form */}
      {isVerifiedPro && question.status !== 'closed' && (
        <div className="glass-card" style={{ padding: '24px', marginBottom: '40px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginBottom: '16px' }}>Provide a Medical Answer</h3>
          <form onSubmit={handleReplySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <textarea className="form-input" rows="4" placeholder="Share your professional advice or guidance regarding this query..." value={newAnswer} onChange={e => setNewAnswer(e.target.value)} required />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Posting...' : 'Post Reply'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Answers Section */}
      <h2 style={{ marginBottom: '24px' }}>Verified Answers ({answers.length})</h2>
      
      {answers.length === 0 ? (
        <div className="empty-state glass-card">
          <div className="icon">⏳</div>
          <p>No verified answers yet.</p>
          <p style={{ fontSize: '0.9rem', marginTop: '8px' }}>Answers are subject to moderation and may take some time to appear.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '60px' }}>
          {answers.map(ans => <AnswerCard key={ans._id} answer={ans} />)}
        </div>
      )}
    </div>
  );
}
