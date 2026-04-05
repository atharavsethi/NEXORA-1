import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

/* ─── Status Badge ─────────────────────────────────────────────────────────── */
function StatusBadge({ status }) {
  const map = {
    pending:       { color: '#f59e0b', bg: '#fffbeb', label: 'PENDING REVIEW' },
    slot_proposed: { color: '#3b82f6', bg: '#eff6ff', label: 'SLOT PROPOSED' },
    payment_done:  { color: '#8b5cf6', bg: '#f5f3ff', label: 'AWAITING DOCTOR' },
    active:        { color: '#22c55e', bg: '#f0fdf4', label: '🟢 ACTIVE CHAT' },
    completed:     { color: '#64748b', bg: '#f8fafc', label: 'COMPLETED' },
    rejected:      { color: '#ef4444', bg: '#fef2f2', label: 'REJECTED' },
  };
  const s = map[status] || { color: '#64748b', bg: '#f8fafc', label: (status || '').toUpperCase() };
  return (
    <span style={{
      padding: '4px 12px', borderRadius: '100px', fontSize: '0.72rem',
      fontWeight: 700, letterSpacing: '0.5px',
      color: s.color, background: s.bg, border: `1px solid ${s.color}44`,
    }}>{s.label}</span>
  );
}

/* ─── New Chat Request Modal ───────────────────────────────────────────────── */
function NewChatModal({ onClose, onSubmit, selectedDoctorId }) {
  const [doctors, setDoctors] = useState([]);
  const [form, setForm] = useState({
    doctorId: selectedDoctorId || '',
    concern: '',
    preferredDay: '',
    preferredTime: '',
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    axios.get('/api/doctors')
      .then(r => setDoctors(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.doctorId) { setErr('Please select a doctor.'); return; }
    if (!form.concern.trim()) { setErr('Please describe your concern.'); return; }
    setErr('');
    setLoading(true);
    try {
      await onSubmit(form);
    } catch {
      setErr('Failed to submit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px',
    }} onClick={onClose}>
      <div className="glass-card" style={{ maxWidth: '520px', width: '100%', padding: '36px', background: 'var(--white)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ margin: 0 }}>🔒 Request Private Chat</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
        </div>
        <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', fontSize: '0.88rem', color: '#1d4ed8' }}>
          ℹ️ The doctor will review your request and propose a time slot & fee. You only pay after they accept.
        </div>
        {err && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', color: '#dc2626', fontSize: '0.88rem' }}>{err}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label>Choose Doctor *</label>
            <select className="form-input" required value={form.doctorId} onChange={e => setForm({ ...form, doctorId: e.target.value })}>
              <option value="">Select a doctor...</option>
              {doctors.map(d => (
                <option key={d._id} value={d._id}>{d.name}{d.specialty ? ` — ${d.specialty}` : ''}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label>Describe your concern *</label>
            <textarea className="form-input" required rows={4}
              placeholder="Briefly explain your health concern and what you'd like to discuss..."
              value={form.concern} onChange={e => setForm({ ...form, concern: e.target.value })} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <div className="form-group">
              <label>Preferred Day (optional)</label>
              <input type="text" className="form-input" placeholder="e.g. Monday"
                value={form.preferredDay} onChange={e => setForm({ ...form, preferredDay: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Preferred Time (optional)</label>
              <input type="time" className="form-input"
                value={form.preferredTime} onChange={e => setForm({ ...form, preferredTime: e.target.value })} />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Chat Request'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ─── Chat Room Component ──────────────────────────────────────────────────── */
function ChatRoom({ chatId, onClose }) {
  const { user } = useAuth();
  const [chat, setChat]       = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText]       = useState('');
  const [sending, setSending] = useState(false);
  const [chatErr, setChatErr] = useState('');
  const bottomRef = useRef(null);

  // Fetch both chat status AND messages in one go
  const fetchAll = useCallback(async () => {
    try {
      const res = await axios.get(`/api/chats/${chatId}`);
      setChat(res.data);
      const sorted = [...(res.data.messages || [])].sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
      );
      setMessages(sorted);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    } catch (e) {
      setChatErr(e.response?.data?.message || 'Could not load chat.');
    }
  }, [chatId]);

  useEffect(() => {
    fetchAll();
    // Poll every 3 seconds so both sides see updates in near-real-time
    const t = setInterval(fetchAll, 3000);
    return () => clearInterval(t);
  }, [fetchAll]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      const res = await axios.post(`/api/chats/${chatId}/messages`, { text: text.trim() });
      setMessages(prev => [...prev, res.data]);
      setText('');
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send message.');
    } finally { setSending(false); }
  };

  if (!chat && !chatErr) return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="spinner" />
    </div>
  );

  if (chatErr) return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'white', borderRadius: '20px', padding: '40px', textAlign: 'center', maxWidth: '400px' }}>
        <div style={{ fontSize: '2rem', marginBottom: '12px' }}>❌</div>
        <p style={{ color: '#dc2626' }}>{chatErr}</p>
        <button className="btn btn-primary" onClick={onClose} style={{ marginTop: '16px' }}>Close</button>
      </div>
    </div>
  );

  const isPatient = user._id === chat.patientId;
  const other = isPatient ? chat.doctor : chat.patient;
  const isActive = chat.status === 'active';

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px',
    }}>
      <div style={{
        background: 'white', borderRadius: '20px', width: '100%', maxWidth: '700px',
        height: '85vh', maxHeight: '720px', display: 'flex', flexDirection: 'column',
        boxShadow: '0 32px 80px rgba(0,0,0,0.3)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #f1f5f9',
          display: 'flex', alignItems: 'center', gap: '14px',
          background: 'linear-gradient(135deg, #1E5EFF, #4facfe)',
          borderRadius: '20px 20px 0 0', flexShrink: 0,
        }}>
          <div style={{
            width: 46, height: 46, borderRadius: '50%', background: 'rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: '1.2rem', color: 'white', flexShrink: 0,
          }}>
            {(other?.name || '?')[0].toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'white', fontWeight: 700, fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {other?.name || 'Chat'}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.78rem', marginTop: '2px' }}>
              🔒 Private Chat · {chat.proposedDay} {chat.proposedTime}
            </div>
          </div>
          {/* Status pill */}
          <span style={{
            background: isActive ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.4)', padding: '3px 12px',
            borderRadius: '100px', fontSize: '0.72rem', fontWeight: 700, color: 'white',
          }}>
            {isActive ? '🟢 Live' : chat.status?.replace(/_/g, ' ').toUpperCase()}
          </span>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
            borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', fontSize: '1rem', flexShrink: 0,
          }}>✕</button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0', fontSize: '0.9rem' }}>
              {isActive ? '💬 Chat is open! Start the conversation.' : '⏳ Waiting for chat to be activated by the doctor.'}
            </div>
          )}
          {messages.map(msg => {
            const mine = msg.senderId === user._id;
            return (
              <div key={msg._id} style={{ display: 'flex', flexDirection: mine ? 'row-reverse' : 'row', gap: '8px', alignItems: 'flex-end' }}>
                {!mine && (
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #1E5EFF, #4facfe)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>
                    {(msg.senderName || '?')[0].toUpperCase()}
                  </div>
                )}
                <div style={{
                  maxWidth: '68%', padding: '10px 14px',
                  borderRadius: mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: mine ? '#1E5EFF' : '#f1f5f9',
                  color: mine ? 'white' : '#0f172a',
                  fontSize: '0.92rem', lineHeight: '1.5',
                }}>
                  {!mine && <div style={{ fontSize: '0.7rem', fontWeight: 700, marginBottom: '4px', opacity: 0.65 }}>{msg.senderName}</div>}
                  <div>{msg.text}</div>
                  <div style={{ fontSize: '0.62rem', opacity: 0.6, marginTop: '4px', textAlign: 'right' }}>
                    {new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        {isActive ? (
          <form onSubmit={sendMessage} style={{ padding: '16px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '10px', flexShrink: 0 }}>
            <input
              type="text" className="form-input" style={{ flex: 1, borderRadius: '12px' }}
              placeholder="Type a message…"
              value={text} onChange={e => setText(e.target.value)}
              autoFocus
            />
            <button type="submit" className="btn btn-primary" disabled={sending || !text.trim()} style={{ borderRadius: '12px', padding: '0 20px' }}>
              {sending ? '…' : '➤'}
            </button>
          </form>
        ) : (
          <div style={{
            padding: '16px 24px', textAlign: 'center', color: '#64748b',
            borderTop: '1px solid #f1f5f9', fontSize: '0.88rem', flexShrink: 0,
            background: '#fafafa', borderRadius: '0 0 20px 20px',
          }}>
            {chat.status === 'completed' ? '✅ This chat session has been completed.' : '⏳ Waiting for the doctor to open the chat room…'}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Inline Propose Slot Form (Doctor Side) ────────────────────────────────── */
function ProposeSlotInline({ chatId, onDone }) {
  const [open, setOpen]   = useState(false);
  const [form, setForm]   = useState({ proposedDay: '', proposedTime: '', fee: '', duration: '30', doctorNote: '' });
  const [loading, setLoading] = useState(false);
  const [err, setErr]     = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!form.proposedDay || !form.proposedTime || !form.fee) {
      setErr('Day, time and fee are all required.'); return;
    }
    setErr('');
    setLoading(true);
    try {
      await axios.patch(`/api/chats/${chatId}/propose`, form);
      setOpen(false);
      onDone();
    } catch (err) {
      setErr(err.response?.data?.message || 'Failed to propose slot.');
    } finally { setLoading(false); }
  };

  if (!open) return (
    <button className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>
      ✅ Accept & Propose Slot
    </button>
  );

  return (
    <form onSubmit={submit} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '12px', width: '100%', marginTop: '8px' }}>
      <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '12px', fontSize: '0.9rem' }}>📅 Set Appointment Details</div>
      {err && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '8px 12px', marginBottom: '12px', color: '#dc2626', fontSize: '0.82rem' }}>{err}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px', marginBottom: '10px' }}>
        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>Day *</label>
          <input type="text" className="form-input" required placeholder="e.g. Monday"
            value={form.proposedDay} onChange={e => setForm({ ...form, proposedDay: e.target.value })} />
        </div>
        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>Time *</label>
          <input type="time" className="form-input" required
            value={form.proposedTime} onChange={e => setForm({ ...form, proposedTime: e.target.value })} />
        </div>
        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>Fee (₹) *</label>
          <input type="number" className="form-input" required min="0" placeholder="500"
            value={form.fee} onChange={e => setForm({ ...form, fee: e.target.value })} />
        </div>
        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>Duration (min)</label>
          <input type="number" className="form-input" min="15" placeholder="30"
            value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} />
        </div>
      </div>
      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>Note to patient (optional)</label>
        <input type="text" className="form-input" placeholder="e.g. Please bring your reports..."
          value={form.doctorNote} onChange={e => setForm({ ...form, doctorNote: e.target.value })} />
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>{loading ? 'Saving…' : 'Confirm & Notify Patient'}</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setOpen(false); setErr(''); }}>Cancel</button>
      </div>
    </form>
  );
}

/* ─── Main PrivateChats Page ─────────────────────────────────────────────────── */
export default function PrivateChats() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [chats,   setChats]   = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requestDoctorId, setRequestDoctorId] = useState(null);
  const [activeChatId,    setActiveChatId]    = useState(null);
  const [error, setError] = useState('');

  // Doctors and students both view their incoming requests; regular users (role='user') view their own requests
  const isMedical = user?.role === 'doctor' || user?.role === 'student';

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchData();
  }, [user]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Medical professionals see their incoming requests; patients see their outgoing ones
      const chatEndpoint = isMedical ? '/api/chats/medical' : '/api/chats/my';
      const reqs = [axios.get(chatEndpoint)];
      if (!isMedical) reqs.push(axios.get('/api/doctors'));

      const results = await Promise.all(reqs);
      setChats(results[0].data || []);
      if (!isMedical && results[1]) {
        setDoctors(Array.isArray(results[1].data) ? results[1].data : []);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
      } else {
        setError(err.response?.data?.message || 'Failed to load chat data.');
      }
    } finally { setLoading(false); }
  }, [isMedical]);

  const handleNewRequest = async (form) => {
    await axios.post('/api/chats/request', form);
    setRequestDoctorId(null);
    fetchData();
  };

  const handlePay = async (id) => {
    try {
      await axios.post(`/api/chats/${id}/pay`);
      fetchData();
    } catch (err) { alert(err.response?.data?.message || 'Payment failed'); }
  };

  const handleDoctorAction = async (id, action, extra = {}) => {
    try {
      await axios.patch(`/api/chats/${id}/${action}`, extra);
      fetchData();
    } catch (err) { alert(err.response?.data?.message || `Failed to ${action}`); }
  };

  if (loading) return <div className="spinner" style={{ marginTop: '200px' }} />;

  return (
    <div className="page-wrapper container" style={{ maxWidth: '920px', paddingBottom: '60px' }}>
      {/* Request Modal */}
      {requestDoctorId && (
        <NewChatModal
          selectedDoctorId={requestDoctorId === true ? '' : requestDoctorId}
          onClose={() => setRequestDoctorId(null)}
          onSubmit={handleNewRequest}
        />
      )}

      {/* Active Chat Room */}
      {activeChatId && (
        <ChatRoom chatId={activeChatId} onClose={() => { setActiveChatId(null); fetchData(); }} />
      )}

      {/* Page Header */}
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ marginBottom: '6px' }}>🔒 Private Doctor Chats</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          {isMedical
            ? 'Review and manage incoming private chat requests from patients.'
            : 'Request a private, paid consultation chat with a verified doctor.'}
        </p>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '12px', padding: '14px 18px', marginBottom: '24px', color: '#dc2626', fontWeight: 600 }}>
          ⚠️ {error}
        </div>
      )}

      {/* PATIENT: Doctor Grid */}
      {!isMedical && (
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Available Doctors</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setRequestDoctorId(true)}>
              + New Request
            </button>
          </div>

          {doctors.length === 0 ? (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🩺</div>
              <p style={{ color: '#94a3b8' }}>No verified doctors available yet.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '16px' }}>
              {doctors.map(doctor => (
                <div key={doctor._id} className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #1E5EFF, #4facfe)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.15rem', fontWeight: 800, flexShrink: 0 }}>
                      {(doctor.name || '?')[0].toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <h4 style={{ margin: 0, fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doctor.name}</h4>
                      <p style={{ margin: '2px 0 0', color: 'var(--primary)', fontSize: '0.82rem', fontWeight: 600 }}>{doctor.specialty || 'General Physician'}</p>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginBottom: '14px', flex: 1, lineHeight: 1.7 }}>
                    {doctor.institution && <div>🏥 {doctor.institution}</div>}
                    <div>⭐ {doctor.rating || '4.5'} ({doctor.reviewCount || 0} reviews)</div>
                    {doctor.experience && <div>⏱ {doctor.experience} experience</div>}
                    {doctor.consultationFee > 0 && <div>💰 ₹{doctor.consultationFee} per session</div>}
                  </div>
                  <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
                    onClick={() => setRequestDoctorId(doctor._id)}>
                    Request Private Chat
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Chat Requests List */}
      <div>
        <h3 style={{ marginBottom: '16px', fontSize: '1.1rem' }}>
          {isMedical ? '📥 Incoming Requests' : '📤 My Chat Requests'}
          {chats.length > 0 && (
            <span style={{ marginLeft: '8px', background: 'rgba(30,94,255,0.1)', color: '#1E5EFF', padding: '2px 8px', borderRadius: '100px', fontSize: '0.78rem', fontWeight: 700 }}>
              {chats.length}
            </span>
          )}
        </h3>

        {chats.length === 0 ? (
          <div className="glass-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>💬</div>
            <h4>{isMedical ? 'No chat requests yet' : 'No requests sent yet'}</h4>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
              {isMedical
                ? 'When patients request a private session with you, they will appear here.'
                : 'Pick a doctor above and click "Request Private Chat" to get started.'}
            </p>
            {!isMedical && (
              <button className="btn btn-primary" onClick={() => setRequestDoctorId(true)}>
                Start a New Request
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {chats.map(chat => (
              <div key={chat._id} className="glass-card" style={{ padding: '24px' }}>
                {/* Card header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                    <div style={{
                      width: 50, height: 50, borderRadius: '50%', flexShrink: 0,
                      background: 'linear-gradient(135deg, #1E5EFF, #4facfe)',
                      color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: '1.1rem',
                    }}>
                      {(isMedical ? chat.patient?.name : chat.doctor?.name || '?')[0]?.toUpperCase()}
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1rem' }}>
                        {isMedical ? chat.patient?.name : chat.doctor?.name}
                      </h4>
                      <p style={{ margin: '2px 0 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        {isMedical ? (chat.patient?.email || 'Patient') : (chat.doctor?.specialty || 'Doctor')}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={chat.status} />
                </div>

                {/* Concern */}
                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', marginBottom: '14px', fontSize: '0.88rem', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontWeight: 700, color: '#64748b', fontSize: '0.72rem', marginBottom: '4px', letterSpacing: '0.5px' }}>CONCERN</div>
                  <div style={{ color: '#334155', lineHeight: 1.5 }}>{chat.concern}</div>
                  {(chat.preferredDay || chat.preferredTime) && (
                    <div style={{ marginTop: '6px', color: '#64748b', fontSize: '0.8rem' }}>
                      Preferred: {chat.preferredDay} {chat.preferredTime}
                    </div>
                  )}
                </div>

                {/* Proposed slot details */}
                {chat.proposedDay && chat.status !== 'pending' && chat.status !== 'rejected' && (
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
                    {[
                      { icon: '🗓', val: chat.proposedDay },
                      { icon: '⏰', val: chat.proposedTime },
                      { icon: '💰', val: `₹${chat.fee} · ${chat.duration} mins` },
                    ].map(item => (
                      <div key={item.icon} style={{ padding: '7px 14px', background: 'rgba(30,94,255,0.06)', border: '1px solid rgba(30,94,255,0.15)', borderRadius: '8px', fontSize: '0.84rem', fontWeight: 600 }}>
                        {item.icon} {item.val}
                      </div>
                    ))}
                  </div>
                )}

                {/* Doctor note */}
                {chat.doctorNote && (
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '14px', fontStyle: 'italic', padding: '8px 12px', background: 'rgba(99,102,241,0.05)', borderLeft: '3px solid #6366f1', borderRadius: '0 8px 8px 0' }}>
                    📝 {chat.doctorNote}
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>

                  {/* ── PATIENT ACTIONS ── */}
                  {!isMedical && chat.status === 'slot_proposed' && (
                    <>
                      <button className="btn btn-primary" onClick={() => handlePay(chat._id)}>
                        💳 Pay ₹{chat.fee} & Confirm
                      </button>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Demo mode – no real payment</span>
                    </>
                  )}
                  {!isMedical && chat.status === 'active' && (
                    <button className="btn btn-primary" onClick={() => setActiveChatId(chat._id)}>
                      💬 Open Chat Room
                    </button>
                  )}
                  {!isMedical && chat.status === 'payment_done' && (
                    <span style={{ color: '#6366f1', fontSize: '0.88rem', fontWeight: 600 }}>
                      ✅ Payment confirmed. Waiting for doctor to open the chat…
                    </span>
                  )}

                  {/* ── MEDICAL PROFESSIONAL ACTIONS ── */}
                  {isMedical && chat.status === 'pending' && (
                    <>
                      <ProposeSlotInline chatId={chat._id} onDone={fetchData} />
                      <button className="btn btn-ghost btn-sm" style={{ color: '#ef4444' }}
                        onClick={() => handleDoctorAction(chat._id, 'reject', { doctorNote: 'Not available at this time.' })}>
                        ✕ Reject
                      </button>
                    </>
                  )}
                  {isMedical && chat.status === 'payment_done' && (
                    <button className="btn btn-primary" onClick={() => handleDoctorAction(chat._id, 'open')}>
                      🚀 Open Chat Room for Patient
                    </button>
                  )}
                  {isMedical && chat.status === 'active' && (
                    <>
                      <button className="btn btn-primary" onClick={() => setActiveChatId(chat._id)}>
                        💬 Enter Chat
                      </button>
                      <button className="btn btn-ghost btn-sm" style={{ color: '#64748b' }}
                        onClick={() => handleDoctorAction(chat._id, 'close')}>
                        ✓ Mark Completed
                      </button>
                    </>
                  )}

                  {/* Timestamp */}
                  <span style={{ marginLeft: 'auto', color: '#94a3b8', fontSize: '0.78rem' }}>
                    {new Date(chat.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
