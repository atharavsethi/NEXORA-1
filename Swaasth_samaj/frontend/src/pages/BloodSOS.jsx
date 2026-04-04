import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

const CITIES = [
  'Delhi', 'Mumbai', 'Hyderabad', 'Bangalore', 'Chandigarh', 'Pune',
  'Chennai', 'Kolkata', 'Jaipur', 'Ahmedabad'
];

// ── Blood Group Badge ─────────────────────────────────────────────────────────
function BloodBadge({ group, size = 'sm' }) {
  const colors = {
    'A+': '#e53e3e', 'A-': '#c53030', 'B+': '#d69e2e', 'B-': '#b7791f',
    'O+': '#38a169', 'O-': '#276749', 'AB+': '#6b46c1', 'AB-': '#553c9a',
  };
  const bg = colors[group] || '#e53e3e';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: bg, color: 'white', fontWeight: 800,
      padding: size === 'lg' ? '8px 16px' : '4px 10px',
      borderRadius: '8px', fontSize: size === 'lg' ? '1.2rem' : '0.85rem',
      letterSpacing: '0.5px',
    }}>{group}</span>
  );
}

// ── Chat Room Component ───────────────────────────────────────────────────────
function BloodChatRoom({ request, currentUser, onBack }) {
  const [messages, setMessages] = useState(request.messages || []);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`/api/blood/chat/${request._id}`);
        setMessages(res.data.messages || []);
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [request._id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const res = await axios.post(`/api/blood/chat/${request._id}`, { text });
      setMessages(res.data.messages || []);
      setText('');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f8fafc', borderRadius: '20px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
      <div style={{ background: 'linear-gradient(135deg, #e53e3e, #c53030)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontWeight: 600 }}>← Back</button>
        <div style={{ color: 'white' }}>
          <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>🩸 Blood SOS Chat</div>
          <div style={{ fontSize: '0.8rem', opacity: 0.85 }}>
            {currentUser._id === request.recipientId ? `Chatting with: ${request.donorName}` : `Chatting with: ${request.recipientName}`}
          </div>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '300px', maxHeight: '480px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 20px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>💬</div>
            <p>No messages yet. Start the conversation!</p>
          </div>
        )}
        {messages.map(m => {
          const isMe = m.senderId === currentUser._id;
          return (
            <div key={m._id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '70%', padding: '12px 16px', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                background: isMe ? '#e53e3e' : 'white', color: isMe ? 'white' : '#0f172a',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}>
                {!isMe && <div style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px', color: '#e53e3e' }}>{m.senderName}</div>}
                <div style={{ lineHeight: 1.5 }}>{m.text}</div>
                <div style={{ fontSize: '0.7rem', opacity: 0.65, marginTop: '4px', textAlign: 'right' }}>
                  {new Date(m.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: '16px 20px', background: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '12px' }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Type a message..."
          style={{ flex: 1, border: '2px solid #e2e8f0', borderRadius: '100px', padding: '12px 18px', outline: 'none', fontSize: '1rem' }}
        />
        <button onClick={send} disabled={sending || !text.trim()} style={{
          background: '#e53e3e', color: 'white', border: 'none', borderRadius: '100px',
          padding: '12px 24px', fontWeight: 700, cursor: 'pointer',
          opacity: (!text.trim() || sending) ? 0.5 : 1
        }}>Send</button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function BloodSOS() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [showDonorPopup, setShowDonorPopup] = useState(false);
  const [activeTab, setActiveTab] = useState('find');

  // Find Blood search state
  const [searchCity, setSearchCity] = useState('');
  const [searchGroup, setSearchGroup] = useState('');
  const [donors, setDonors] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  // Donor form
  const [donorForm, setDonorForm] = useState({ bloodGroup: '', city: '', phone: '', lastDonated: '', available: true });
  const [myDonorProfile, setMyDonorProfile] = useState(null);
  const [savingDonor, setSavingDonor] = useState(false);
  const [donorMsg, setDonorMsg] = useState('');

  // Requests
  const [myRequests, setMyRequests] = useState({ inbound: [], outbound: [] });
  const [loadingRequests, setLoadingRequests] = useState(false);

  // Chat
  const [activeChat, setActiveChat] = useState(null);

  // Request modal
  const [requestingDonor, setRequestingDonor] = useState(null);
  const [requestMsg, setRequestMsg] = useState('');
  const [sendingReq, setSendingReq] = useState(false);

  // ── Show donor popup on first visit ────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const seenKey = `blood_sos_popup_${user._id}`;
    if (!localStorage.getItem(seenKey)) {
      setShowDonorPopup(true);
      localStorage.setItem(seenKey, '1');
    }
  }, [user]);

  // ── Load my donor profile ───────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    axios.get('/api/blood/my-donor-profile')
      .then(res => {
        if (res.data) {
          setMyDonorProfile(res.data);
          setDonorForm({ bloodGroup: res.data.bloodGroup, city: res.data.city, phone: res.data.phone, lastDonated: res.data.lastDonated || '', available: res.data.available });
        }
      }).catch(() => {});
  }, [user]);

  // ── Fetch requests ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab === 'requests' && user) fetchRequests();
  }, [activeTab, user]);

  const fetchRequests = async () => {
    if (!user) return;
    setLoadingRequests(true);
    try { const res = await axios.get('/api/blood/requests'); setMyRequests(res.data); } catch {}
    setLoadingRequests(false);
  };

  const handleSearch = async () => {
    setSearching(true);
    setSearched(false);
    try {
      const params = {};
      if (searchCity) params.city = searchCity.toLowerCase();
      if (searchGroup) params.bloodGroup = searchGroup;

      const [donorRes, hospRes] = await Promise.all([
        axios.get('/api/blood/donors', { params }),
        axios.get('/api/blood/hospitals', { params }),
      ]);
      setDonors(donorRes.data);
      setHospitals(hospRes.data);
      setSearched(true);
    } catch {}
    setSearching(false);
  };

  // ── Donor registration ──────────────────────────────────────────────────────
  const handleSaveDonor = async (e) => {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    setSavingDonor(true);
    setDonorMsg('');
    try {
      const res = await axios.post('/api/blood/donors', donorForm);
      setMyDonorProfile(res.data);
      setDonorMsg('✅ Donor profile saved! You are now visible to people in need.');
    } catch (err) {
      setDonorMsg('❌ ' + (err.response?.data?.message || 'Failed to save.'));
    }
    setSavingDonor(false);
  };

  const toggleAvailability = async () => {
    try {
      const res = await axios.patch('/api/blood/donors/toggle');
      setMyDonorProfile(res.data);
    } catch (err) { alert(err.response?.data?.message || 'Failed to update.'); }
  };

  const sendRequest = async () => {
    if (!user) { navigate('/login'); return; }
    setSendingReq(true);
    try {
      await axios.post(`/api/blood/request/${requestingDonor._id}`, { message: requestMsg, bloodGroup: requestingDonor.bloodGroup });
      setRequestingDonor(null);
      setRequestMsg('');
      alert('✅ Request sent! The donor will be notified.');
    } catch (err) { alert(err.response?.data?.message || 'Failed to send request.'); }
    setSendingReq(false);
  };

  const handleAccept = async (id) => {
    try { await axios.patch(`/api/blood/request/${id}/accept`); fetchRequests(); }
    catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const handleDecline = async (id) => {
    if (!window.confirm('Decline this blood request?')) return;
    try { await axios.patch(`/api/blood/request/${id}/decline`); fetchRequests(); }
    catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const StatusBadge = ({ status }) => {
    const colors = { pending: '#d69e2e', accepted: '#38a169', declined: '#e53e3e' };
    const labels = { pending: '⏳ Pending', accepted: '✅ Accepted', declined: '❌ Declined' };
    return (
      <span style={{ background: `${colors[status]}20`, color: colors[status], fontWeight: 700, padding: '4px 10px', borderRadius: '100px', fontSize: '0.8rem' }}>
        {labels[status] || status}
      </span>
    );
  };

  if (activeChat) {
    return (
      <div className="page-wrapper" style={{ minHeight: '100vh', background: '#f8fafc' }}>
        <div className="container" style={{ maxWidth: '800px', paddingTop: '40px', paddingBottom: '60px' }}>
          <BloodChatRoom request={activeChat} currentUser={user} onBack={() => { setActiveChat(null); setActiveTab('requests'); fetchRequests(); }} />
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper" style={{ minHeight: '100vh', background: 'linear-gradient(145deg, #fff5f5 0%, #ffffff 100%)' }}>

      {/* ── DONOR POPUP ─────────────────────────────────────────────────── */}
      {showDonorPopup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '24px', padding: '48px 40px', maxWidth: '480px', width: '100%', textAlign: 'center', boxShadow: '0 30px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🩸</div>
            <h2 style={{ fontSize: '1.8rem', color: '#c53030', marginBottom: '12px', fontWeight: 800 }}>Be a Life Saver!</h2>
            <p style={{ color: '#64748b', lineHeight: 1.7, marginBottom: '32px', fontSize: '1.05rem' }}>
              Would you like to <strong>register as a blood donor</strong>? Your information will help connect people in need with donors near them.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => { setShowDonorPopup(false); setActiveTab('donate'); }} style={{ background: '#e53e3e', color: 'white', border: 'none', borderRadius: '100px', padding: '14px 32px', fontWeight: 700, cursor: 'pointer', fontSize: '1.05rem' }}>Yes, Register Me 🩸</button>
              <button onClick={() => setShowDonorPopup(false)} style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '100px', padding: '14px 32px', fontWeight: 700, cursor: 'pointer', fontSize: '1.05rem' }}>Maybe later</button>
            </div>
          </div>
        </div>
      )}

      {/* ── REQUEST MODAL ─────────────────────────────────────────────────── */}
      {requestingDonor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '24px', padding: '40px', maxWidth: '480px', width: '100%', boxShadow: '0 30px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ color: '#c53030', marginBottom: '8px', fontWeight: 800 }}>Send Blood Request</h3>
            <p style={{ color: '#64748b', marginBottom: '20px' }}>
              To: <strong>{requestingDonor.name}</strong> &nbsp;·&nbsp; <BloodBadge group={requestingDonor.bloodGroup} /> &nbsp;·&nbsp; {requestingDonor.city}
            </p>
            <textarea rows={4} placeholder="Add a message (urgency level, contact details, hospital name)..." value={requestMsg} onChange={e => setRequestMsg(e.target.value)} style={{ width: '100%', borderRadius: '12px', border: '2px solid #e2e8f0', padding: '14px', outline: 'none', fontFamily: 'inherit', fontSize: '1rem', resize: 'none', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button onClick={sendRequest} disabled={sendingReq} style={{ flex: 1, background: '#e53e3e', color: 'white', border: 'none', borderRadius: '100px', padding: '14px', fontWeight: 700, cursor: 'pointer', fontSize: '1rem' }}>
                {sendingReq ? 'Sending...' : 'Send Request 🩸'}
              </button>
              <button onClick={() => setRequestingDonor(null)} style={{ flex: 1, background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '100px', padding: '14px', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section style={{ background: 'linear-gradient(135deg, #c53030 0%, #e53e3e 50%, #fc8181 100%)', padding: '120px 0 80px', color: 'white', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-50px', left: '-50px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'absolute', bottom: '-80px', right: '-30px', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div className="container" style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🩸</div>
          <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', fontWeight: 800, marginBottom: '16px', letterSpacing: '-1px' }}>Blood SOS</h1>
          <p style={{ fontSize: '1.2rem', opacity: 0.9, maxWidth: '600px', margin: '0 auto 32px', lineHeight: 1.6, color: 'white' }}>
            Find blood donors near you, connect with blood banks, and save lives — every second counts.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <span style={{ background: 'rgba(255,255,255,0.2)', padding: '8px 20px', borderRadius: '100px', fontSize: '0.95rem', fontWeight: 600 }}>🏥 Blood Banks nearby</span>
            <span style={{ background: 'rgba(255,255,255,0.2)', padding: '8px 20px', borderRadius: '100px', fontSize: '0.95rem', fontWeight: 600 }}>💬 Direct Donor Chat</span>
            <span style={{ background: 'rgba(255,255,255,0.2)', padding: '8px 20px', borderRadius: '100px', fontSize: '0.95rem', fontWeight: 600 }}>🔔 Instant Alerts</span>
          </div>
        </div>
      </section>

      {/* ── TABS ──────────────────────────────────────────────────────────── */}
      <div className="container" style={{ paddingTop: '40px', paddingBottom: '80px' }}>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '40px', background: 'white', borderRadius: '16px', padding: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', flexWrap: 'wrap' }}>
          {[
            { key: 'find', label: '🔍 Find Blood', desc: 'Donors & Hospitals' },
            { key: 'donate', label: '💉 Donate Blood', desc: 'Register as Donor' },
            { key: 'requests', label: '📋 My Requests', desc: 'Inbound & Outbound', requireAuth: true },
          ].map(t => (
            (!t.requireAuth || user) && (
              <button key={t.key} onClick={() => { if (t.requireAuth && !user) { navigate('/login'); return; } setActiveTab(t.key); }}
                style={{ flex: 1, minWidth: '160px', padding: '14px 20px', border: 'none', borderRadius: '12px', cursor: 'pointer', textAlign: 'left', background: activeTab === t.key ? '#e53e3e' : 'transparent', color: activeTab === t.key ? 'white' : '#475569', transition: 'all 0.2s' }}>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>{t.label}</div>
                <div style={{ fontSize: '0.78rem', opacity: 0.8, marginTop: '2px' }}>{t.desc}</div>
              </button>
            )
          ))}
        </div>

        {/* ─────────────────── FIND BLOOD TAB ─────────────────────────── */}
        {activeTab === 'find' && (
          <div>
            {/* Donor Search */}
            <div style={{ background: 'white', borderRadius: '20px', padding: '28px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', marginBottom: '32px' }}>
              <h2 style={{ color: '#c53030', fontWeight: 800, marginBottom: '20px', fontSize: '1.4rem' }}>🔍 Find a Blood Donor</h2>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: '1 1 200px' }}>
                  <label style={{ display: 'block', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Blood Group Needed</label>
                  <select value={searchGroup} onChange={e => setSearchGroup(e.target.value)} style={{ width: '100%', border: '2px solid #e2e8f0', borderRadius: '12px', padding: '12px 16px', outline: 'none', fontSize: '1rem', background: 'white' }}>
                    <option value="">All Blood Groups</option>
                    {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div style={{ flex: '1 1 200px' }}>
                  <label style={{ display: 'block', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>City / Area</label>
                  <select value={searchCity} onChange={e => setSearchCity(e.target.value)} style={{ width: '100%', border: '2px solid #e2e8f0', borderRadius: '12px', padding: '12px 16px', outline: 'none', fontSize: '1rem', background: 'white' }}>
                    <option value="">All Cities</option>
                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <button onClick={handleSearch} disabled={searching} style={{ flex: '0 0 auto', background: '#e53e3e', color: 'white', border: 'none', borderRadius: '12px', padding: '12px 32px', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', height: '50px' }}>
                  {searching ? 'Searching...' : 'Search 🔍'}
                </button>
              </div>
            </div>

            {/* Donor Results */}
            {searched && (
              <div style={{ marginBottom: '48px' }}>
                <h3 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '20px', fontSize: '1.3rem' }}>
                  🧑 Registered Donors <span style={{ fontWeight: 400, color: '#64748b', fontSize: '1rem' }}>({donors.length} found)</span>
                </h3>
                {donors.length === 0 ? (
                  <div style={{ background: 'white', borderRadius: '16px', padding: '40px', textAlign: 'center', color: '#94a3b8', border: '2px dashed #e2e8f0' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🔍</div>
                    <p>No donors found. Try adjusting blood group or city.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                    {donors.map(d => (
                      <div key={d._id} style={{ background: 'white', borderRadius: '18px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, #e53e3e, #fc8181)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.4rem' }}>
                              {d.name?.[0]?.toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>{d.name}</div>
                              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>📍 {d.city}</div>
                            </div>
                          </div>
                          <BloodBadge group={d.bloodGroup} size="lg" />
                        </div>
                        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', fontSize: '0.9rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {d.phone && <span>📞 {d.phone}</span>}
                          <span style={{ color: d.available ? '#38a169' : '#e53e3e', fontWeight: 600 }}>
                            {d.available ? '✅ Available to Donate' : '🔴 Currently Unavailable'}
                          </span>
                        </div>
                        {d.available && (
                          <button onClick={() => { if (!user) { navigate('/login'); return; } setRequestingDonor(d); }}
                            style={{ background: '#e53e3e', color: 'white', border: 'none', borderRadius: '12px', padding: '12px', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' }}>
                            Request This Donor 🩸
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {/* Hospitals Grid */}
                <h3 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '20px', fontSize: '1.3rem' }}>
                  🏥 Blood Banks & Hospitals <span style={{ fontWeight: 400, color: '#64748b', fontSize: '1rem' }}>({hospitals.length} found)</span>
                </h3>

                {hospitals.length === 0 ? (
                  <div style={{ background: 'white', borderRadius: '16px', padding: '40px', textAlign: 'center', color: '#94a3b8', border: '2px dashed #e2e8f0' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🏥</div>
                    <p>No hospitals found for this city. Try searching a different city.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
                    {hospitals.map(h => (
                      <div key={h._id} style={{ background: 'white', borderRadius: '18px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                          <div>
                            <h4 style={{ margin: '0 0 4px 0', color: '#0f172a', fontSize: '1.1rem' }}>{h.name}</h4>
                            <span style={{ background: h.type === 'Government' ? '#ebf8ff' : '#fdf2f8', color: h.type === 'Government' ? '#2b6cb0' : '#9f1239', fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '100px' }}>
                              {h.type}
                            </span>
                          </div>
                          <div style={{ background: '#fff5f5', color: '#e53e3e', padding: '8px 12px', borderRadius: '10px', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.3rem' }}>🏥</div>
                          </div>
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                          <span>📍 {h.address}</span>
                          <span>📞 {h.phone}</span>
                          <span>⏰ {h.timings}</span>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', letterSpacing: '1px', marginBottom: '8px' }}>BLOOD AVAILABLE</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {h.available.map(g => <BloodBadge key={g} group={g} />)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!searched && (
              <div style={{ textAlign: 'center', padding: '80px 20px', color: '#94a3b8' }}>
                <div style={{ fontSize: '5rem', marginBottom: '20px' }}>🩸</div>
                <h3 style={{ color: '#64748b', fontWeight: 700, marginBottom: '10px' }}>Ready to Find Blood?</h3>
                <p>Select your blood group and city above, then hit "Search" to see nearby donors and hospitals.</p>
              </div>
            )}
          </div>
        )}

        {/* ─────────────────── DONATE BLOOD TAB ────────────────────────── */}
        {activeTab === 'donate' && (
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            {!user ? (
              <div style={{ background: 'white', borderRadius: '20px', padding: '48px', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>💉</div>
                <h3 style={{ color: '#c53030', fontWeight: 800, marginBottom: '12px' }}>Login to Register as Donor</h3>
                <p style={{ color: '#64748b', marginBottom: '24px' }}>You need to be logged in to create a donor profile.</p>
                <button onClick={() => navigate('/login')} style={{ background: '#e53e3e', color: 'white', border: 'none', borderRadius: '100px', padding: '14px 32px', fontWeight: 700, cursor: 'pointer' }}>Login / Register</button>
              </div>
            ) : (
              <div>
                {myDonorProfile && (
                  <div style={{ background: '#f0fdf4', border: '2px solid #86efac', borderRadius: '16px', padding: '20px 24px', marginBottom: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#15803d', marginBottom: '4px' }}>✅ You are a registered donor!</div>
                      <div style={{ color: '#166534', fontSize: '0.9rem' }}>
                        Blood Group: <BloodBadge group={myDonorProfile.bloodGroup} /> &nbsp; City: {myDonorProfile.city}
                      </div>
                    </div>
                    <button onClick={toggleAvailability} style={{ background: myDonorProfile.available ? '#e53e3e' : '#38a169', color: 'white', border: 'none', borderRadius: '100px', padding: '10px 24px', fontWeight: 700, cursor: 'pointer' }}>
                      {myDonorProfile.available ? '🔴 Mark Unavailable' : '✅ Mark Available'}
                    </button>
                  </div>
                )}

                <div style={{ background: 'white', borderRadius: '20px', padding: '36px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
                  <h2 style={{ color: '#c53030', fontWeight: 800, marginBottom: '8px' }}>
                    {myDonorProfile ? '✏️ Update Donor Profile' : '💉 Register as Blood Donor'}
                  </h2>
                  <p style={{ color: '#64748b', marginBottom: '28px', fontSize: '0.95rem' }}>Your profile will be visible to people searching for your blood group in your city.</p>

                  <form onSubmit={handleSaveDonor} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                      <label style={{ display: 'block', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Blood Group *</label>
                      <select value={donorForm.bloodGroup} onChange={e => setDonorForm(f => ({ ...f, bloodGroup: e.target.value }))} required style={{ width: '100%', border: '2px solid #e2e8f0', borderRadius: '12px', padding: '12px 16px', outline: 'none', fontSize: '1rem' }}>
                        <option value="">Select blood group</option>
                        {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>City / Area *</label>
                      <select value={donorForm.city} onChange={e => setDonorForm(f => ({ ...f, city: e.target.value }))} required style={{ width: '100%', border: '2px solid #e2e8f0', borderRadius: '12px', padding: '12px 16px', outline: 'none', fontSize: '1rem' }}>
                        <option value="">Select your city</option>
                        {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Phone Number (shown to recipient)</label>
                      <input type="tel" value={donorForm.phone} onChange={e => setDonorForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 98765 43210" style={{ width: '100%', border: '2px solid #e2e8f0', borderRadius: '12px', padding: '12px 16px', outline: 'none', fontSize: '1rem', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Last Donation Date (optional)</label>
                      <input type="date" value={donorForm.lastDonated} onChange={e => setDonorForm(f => ({ ...f, lastDonated: e.target.value }))} style={{ width: '100%', border: '2px solid #e2e8f0', borderRadius: '12px', padding: '12px 16px', outline: 'none', fontSize: '1rem', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input type="checkbox" id="available" checked={donorForm.available} onChange={e => setDonorForm(f => ({ ...f, available: e.target.checked }))} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                      <label htmlFor="available" style={{ fontWeight: 600, color: '#374151', cursor: 'pointer' }}>I am currently available to donate</label>
                    </div>
                    {donorMsg && (
                      <div style={{ padding: '12px 16px', background: donorMsg.startsWith('✅') ? '#f0fdf4' : '#fef2f2', borderRadius: '10px', color: donorMsg.startsWith('✅') ? '#15803d' : '#c53030', fontWeight: 600 }}>
                        {donorMsg}
                      </div>
                    )}
                    <button type="submit" disabled={savingDonor} style={{ background: '#e53e3e', color: 'white', border: 'none', borderRadius: '100px', padding: '15px', fontWeight: 700, cursor: 'pointer', fontSize: '1.05rem' }}>
                      {savingDonor ? 'Saving...' : (myDonorProfile ? 'Update Profile' : 'Register as Donor 🩸')}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─────────────────── MY REQUESTS TAB ─────────────────────────── */}
        {activeTab === 'requests' && user && (
          <div>
            {loadingRequests ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Loading your requests...</div>
            ) : (
              <>
                <h3 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '16px', fontSize: '1.3rem' }}>
                  📥 Inbound Requests <span style={{ fontWeight: 400, color: '#64748b', fontSize: '1rem' }}>({myRequests.inbound.length})</span>
                </h3>
                {myRequests.inbound.length === 0 ? (
                  <div style={{ background: 'white', borderRadius: '16px', padding: '32px', textAlign: 'center', color: '#94a3b8', border: '2px dashed #e2e8f0', marginBottom: '40px' }}>No one has requested your blood yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '48px' }}>
                    {myRequests.inbound.map(r => (
                      <div key={r._id} style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                          <div>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '1.05rem' }}>Request from {r.recipientName}</div>
                            <div style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '4px' }}>
                              Blood needed: <BloodBadge group={r.bloodGroup} /> &nbsp;·&nbsp; {new Date(r.createdAt).toLocaleDateString('en-IN')}
                            </div>
                          </div>
                          <StatusBadge status={r.status} />
                        </div>
                        {r.message && <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', color: '#475569', fontSize: '0.95rem', marginBottom: '16px', borderLeft: '3px solid #e53e3e' }}>"{r.message}"</div>}
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                          {r.status === 'pending' && (
                            <>
                              <button onClick={() => handleAccept(r._id)} style={{ background: '#38a169', color: 'white', border: 'none', borderRadius: '100px', padding: '10px 24px', fontWeight: 700, cursor: 'pointer' }}>✅ Accept</button>
                              <button onClick={() => handleDecline(r._id)} style={{ background: '#e53e3e', color: 'white', border: 'none', borderRadius: '100px', padding: '10px 24px', fontWeight: 700, cursor: 'pointer' }}>❌ Decline</button>
                            </>
                          )}
                          {r.status === 'accepted' && (
                            <button onClick={() => setActiveChat(r)} style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: '100px', padding: '10px 24px', fontWeight: 700, cursor: 'pointer' }}>💬 Open Chat</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <h3 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '16px', fontSize: '1.3rem' }}>
                  📤 My Sent Requests <span style={{ fontWeight: 400, color: '#64748b', fontSize: '1rem' }}>({myRequests.outbound.length})</span>
                </h3>
                {myRequests.outbound.length === 0 ? (
                  <div style={{ background: 'white', borderRadius: '16px', padding: '32px', textAlign: 'center', color: '#94a3b8', border: '2px dashed #e2e8f0' }}>You haven't sent any blood requests yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {myRequests.outbound.map(r => (
                      <div key={r._id} style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                          <div>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '1.05rem' }}>Request to {r.donorName}</div>
                            <div style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '4px' }}>
                              Blood group: <BloodBadge group={r.bloodGroup} /> &nbsp;·&nbsp; Contact: {r.donorPhone || 'N/A'} &nbsp;·&nbsp; {new Date(r.createdAt).toLocaleDateString('en-IN')}
                            </div>
                          </div>
                          <StatusBadge status={r.status} />
                        </div>
                        {r.message && <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', color: '#475569', fontSize: '0.95rem', marginBottom: '16px', borderLeft: '3px solid #3b82f6' }}>"{r.message}"</div>}
                        {r.status === 'accepted' && (
                          <button onClick={() => setActiveChat(r)} style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: '100px', padding: '10px 24px', fontWeight: 700, cursor: 'pointer' }}>💬 Open Chat</button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
