import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AdminLogin from './AdminLogin';

/* ── Sidebar ──────────────────────────────────────────────────────────────── */
function Sidebar({ active, setActive, onLogout, admin }) {
  const items = [
    { id: 'dashboard',  icon: '🏠', label: 'Dashboard' },
    { id: 'applications', icon: '📋', label: 'Applications' },
    { id: 'tickets',    icon: '🎫', label: 'Support Tickets' },
    { id: 'users',      icon: '👥', label: 'Users' },
  ];
  return (
    <div style={{
      width: 220, minHeight: '100vh', background: '#0f172a',
      display: 'flex', flexDirection: 'column',
      borderRight: '1px solid #1e293b', flexShrink: 0,
      position: 'sticky', top: 0, height: '100vh',
    }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid #1e293b' }}>
        <div style={{ color: 'white', fontWeight: 800, fontSize: '1.2rem' }}>
          Swasth<span style={{ color: '#4ade80' }}>Samaj</span>
        </div>
        <div style={{ color: '#64748b', fontSize: '0.72rem', letterSpacing: '1px', marginTop: '2px' }}>ADMIN PANEL</div>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: '16px 12px' }}>
        {items.map(item => (
          <button key={item.id} onClick={() => setActive(item.id)} style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            width: '100%', padding: '12px 14px',
            borderRadius: '10px', border: 'none', cursor: 'pointer',
            background: active === item.id ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : 'transparent',
            color: active === item.id ? 'white' : '#94a3b8',
            fontWeight: 600, fontSize: '0.9rem', marginBottom: '4px',
            textAlign: 'left', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { if (active !== item.id) e.currentTarget.style.background = '#1e293b'; }}
          onMouseLeave={e => { if (active !== item.id) e.currentTarget.style.background = 'transparent'; }}
          >
            <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* Bottom user + sign out */}
      <div style={{ padding: '16px 12px', borderTop: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', marginBottom: '8px' }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700 }}>A</div>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: '0.88rem' }}>Admin</div>
            <div style={{ color: '#f59e0b', fontSize: '0.7rem', fontWeight: 700 }}>SUPER ADMIN</div>
          </div>
        </div>
        <button onClick={onLogout} style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          width: '100%', padding: '10px 14px',
          borderRadius: '8px', border: '1px solid #374151', cursor: 'pointer',
          background: '#1e293b', color: '#f87171', fontWeight: 600, fontSize: '0.88rem',
        }}>
          🚪 Sign Out
        </button>
      </div>
    </div>
  );
}

/* ── Stat Card ──────────────────────────────────────────────────────────────── */
function StatCard({ icon, value, label, color }) {
  return (
    <div style={{
      background: '#1e293b', border: '1px solid #334155',
      borderRadius: '14px', padding: '24px',
    }}>
      <div style={{ fontSize: '2rem', marginBottom: '12px' }}>{icon}</div>
      <div style={{ fontSize: '2.5rem', fontWeight: 800, color: color || '#60a5fa', marginBottom: '4px' }}>{value ?? '—'}</div>
      <div style={{ color: '#94a3b8', fontSize: '0.88rem' }}>{label}</div>
    </div>
  );
}

/* ── Dashboard Home ─────────────────────────────────────────────────────────── */
function DashboardHome({ stats, recentActivity, setActive }) {
  return (
    <div>
      <h1 style={{ color: 'white', fontSize: '1.8rem', fontWeight: 800, margin: '0 0 8px' }}>Admin Dashboard</h1>
      <p style={{ color: '#94a3b8', marginBottom: '32px' }}>Manage applications, support tickets, and users from here.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <StatCard icon="⏳" value={stats.pendingVerifications} label="Pending Applications" color="#f59e0b" />
        <StatCard icon="🎫" value={stats.openTickets} label="Open Support Tickets" color="#f97316" />
        <StatCard icon="👨‍⚕️" value={stats.verifiedDoctors} label="Verified Doctors" color="#4ade80" />
        <StatCard icon="🧑‍🎓" value={stats.verifiedStudents} label="Verified Students" color="#a78bfa" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Recent Activity */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '24px' }}>
          <h3 style={{ color: 'white', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🕐 Recent Activity
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {recentActivity.length === 0 && <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No recent activity.</p>}
            {recentActivity.map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1.1rem', marginTop: '2px' }}>{a.icon}</span>
                <div>
                  <div style={{ color: '#e2e8f0', fontSize: '0.88rem' }} dangerouslySetInnerHTML={{ __html: a.text }} />
                  <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '2px' }}>{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '24px' }}>
          <h3 style={{ color: 'white', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ⚡ Quick Actions
          </h3>
          {[
            { icon: '📋', title: 'Review Pending Applications', sub: `${stats.pendingVerifications || 0} applications await review`, tab: 'applications' },
            { icon: '🎫', title: 'Handle Support Tickets', sub: `${stats.openTickets || 0} open tickets`, tab: 'tickets' },
            { icon: '👥', title: 'Manage All Users', sub: `${stats.totalUsers || 0} total registered`, tab: 'users' },
          ].map(q => (
            <button key={q.tab} onClick={() => setActive(q.tab)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', padding: '16px', borderRadius: '10px',
              background: '#0f172a', border: '1px solid #334155', cursor: 'pointer',
              marginBottom: '10px', color: 'inherit', textAlign: 'left',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#4f46e5'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#334155'}
            >
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ fontSize: '1.3rem' }}>{q.icon}</span>
                <div>
                  <div style={{ color: 'white', fontWeight: 600, fontSize: '0.9rem' }}>{q.title}</div>
                  <div style={{ color: '#64748b', fontSize: '0.78rem' }}>{q.sub}</div>
                </div>
              </div>
              <span style={{ color: '#4f46e5' }}>→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Applications (Pending Verifications) ───────────────────────────────────── */
function Applications() {
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/admin/pending-verifications')
      .then(r => setVerifications(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handle = async (id, approved) => {
    await axios.put(`/api/admin/verify/${id}`, { approved });
    setVerifications(verifications.filter(v => v._id !== id));
  };

  if (loading) return <div style={{ color: 'white', padding: '40px' }}>Loading…</div>;

  return (
    <div>
      <h2 style={{ color: 'white', marginBottom: '8px' }}>📋 Applications</h2>
      <p style={{ color: '#94a3b8', marginBottom: '28px' }}>Review doctor and student verification requests.</p>
      {verifications.length === 0 ? (
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>✅</div>
          <p style={{ color: '#94a3b8' }}>No pending applications. All verified!</p>
        </div>
      ) : verifications.map(u => (
        <div key={u._id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '24px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ color: 'white', margin: 0 }}>{u.name}</h3>
                <span style={{
                  padding: '3px 10px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 700,
                  background: u.role === 'doctor' ? 'rgba(59,130,246,0.2)' : 'rgba(167,139,250,0.2)',
                  color: u.role === 'doctor' ? '#60a5fa' : '#a78bfa',
                }}>{u.role.toUpperCase()}</span>
              </div>
              <div style={{ color: '#94a3b8', fontSize: '0.88rem', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <span>📧 {u.email}</span>
                {u.specialty && <span>🩺 {u.specialty}</span>}
                {u.institution && <span>🏥 {u.institution}</span>}
                {u.experience && <span>⏳ Exp: {u.experience}</span>}
                {u.licenseNumber && <span>🪪 License: {u.licenseNumber}</span>}
                {u.studentId && <span>🎓 Student ID: {u.studentId}</span>}
                {u.college && <span>🏫 College: {u.college}</span>}
                {u.yearOfStudy && <span>📚 Year: {u.yearOfStudy}</span>}
              </div>
              {u.credentialUrl && (
                <a href={`http://localhost:5000${u.credentialUrl}`} target="_blank" rel="noreferrer" style={{
                  display: 'inline-block', marginTop: '12px', padding: '7px 14px',
                  border: '1px solid #334155', borderRadius: '8px', color: '#60a5fa',
                  fontSize: '0.82rem', textDecoration: 'none',
                }}>
                  📄 View Credential Document
                </a>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => handle(u._id, false)} style={{
                padding: '10px 20px', borderRadius: '10px', border: '1px solid #ef4444',
                background: 'transparent', color: '#ef4444', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem',
              }}>✕ Reject</button>
              <button onClick={() => handle(u._id, true)} style={{
                padding: '10px 20px', borderRadius: '10px', border: 'none',
                background: 'linear-gradient(135deg, #16a34a, #15803d)', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem',
              }}>✓ Approve & Verify</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Support Tickets ─────────────────────────────────────────────────────────── */
function SupportTicketsPanel() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(null);
  const [response, setResponse] = useState('');

  useEffect(() => {
    axios.get('/api/admin/support-tickets')
      .then(r => setTickets(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const resolve = async (id) => {
    await axios.patch(`/api/admin/support-tickets/${id}`, { status: 'resolved', response });
    setTickets(tickets.map(t => t._id === id ? { ...t, status: 'resolved', response } : t));
    setResponding(null);
    setResponse('');
  };

  const statusColor = { pending: '#f59e0b', in_progress: '#60a5fa', resolved: '#4ade80' };

  if (loading) return <div style={{ color: 'white', padding: '40px' }}>Loading…</div>;

  return (
    <div>
      <h2 style={{ color: 'white', marginBottom: '8px' }}>🎫 Support Tickets</h2>
      <p style={{ color: '#94a3b8', marginBottom: '28px' }}>Respond to and resolve user support requests.</p>
      {tickets.length === 0 ? (
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📭</div>
          <p style={{ color: '#94a3b8' }}>No support tickets yet.</p>
        </div>
      ) : tickets.map(t => (
        <div key={t._id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '24px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div>
              <h3 style={{ color: 'white', margin: '0 0 4px' }}>{t.subject}</h3>
              <span style={{ color: '#64748b', fontSize: '0.82rem' }}>
                From: <strong style={{ color: '#94a3b8' }}>{t.userName}</strong> ({t.userEmail}) · {new Date(t.createdAt).toLocaleDateString()}
              </span>
            </div>
            <span style={{
              padding: '4px 12px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 700,
              background: `${statusColor[t.status] || '#64748b'}22`, color: statusColor[t.status] || '#64748b',
            }}>{t.status?.replace('_', ' ').toUpperCase()}</span>
          </div>
          <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '16px' }}>{t.message}</p>
          {t.response && (
            <div style={{ background: '#0f172a', borderLeft: '3px solid #4f46e5', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px' }}>
              <div style={{ color: '#6366f1', fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px' }}>ADMIN RESPONSE</div>
              <p style={{ color: '#e2e8f0', fontSize: '0.9rem', margin: 0 }}>{t.response}</p>
            </div>
          )}
          {t.status !== 'resolved' && (
            responding === t._id ? (
              <div>
                <textarea
                  placeholder="Type your response to the user…"
                  value={response}
                  onChange={e => setResponse(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: '10px',
                    border: '1px solid #334155', background: '#0f172a', color: 'white',
                    fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box',
                    fontFamily: 'inherit', marginBottom: '10px',
                  }}
                />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => resolve(t._id)} style={{
                    padding: '9px 20px', borderRadius: '8px', border: 'none',
                    background: '#16a34a', color: 'white', fontWeight: 700, cursor: 'pointer',
                  }}>✓ Mark Resolved</button>
                  <button onClick={() => { setResponding(null); setResponse(''); }} style={{
                    padding: '9px 20px', borderRadius: '8px', border: '1px solid #334155',
                    background: 'transparent', color: '#94a3b8', fontWeight: 700, cursor: 'pointer',
                  }}>Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setResponding(t._id)} style={{
                padding: '9px 20px', borderRadius: '8px', border: '1px solid #4f46e5',
                background: 'rgba(79,70,229,0.1)', color: '#818cf8', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem',
              }}>💬 Respond & Resolve</button>
            )
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Users Table ─────────────────────────────────────────────────────────────── */
function UsersPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    axios.get('/api/admin/all-users')
      .then(r => setUsers(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const roleColor = { admin: '#f59e0b', doctor: '#60a5fa', student: '#a78bfa', user: '#4ade80' };

  if (loading) return <div style={{ color: 'white', padding: '40px' }}>Loading…</div>;

  return (
    <div>
      <h2 style={{ color: 'white', marginBottom: '8px' }}>👥 All Users</h2>
      <p style={{ color: '#94a3b8', marginBottom: '20px' }}>Manage all registered platform users.</p>
      <input
        type="text" placeholder="Search by name or email…" value={search}
        onChange={e => setSearch(e.target.value)}
        style={{
          width: '100%', padding: '12px 16px', borderRadius: '10px', boxSizing: 'border-box',
          border: '1px solid #334155', background: '#1e293b', color: 'white',
          fontSize: '0.95rem', marginBottom: '20px', fontFamily: 'inherit',
        }}
      />
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #334155' }}>
              {['Name', 'Email', 'Role', 'Verified', 'Joined'].map(h => (
                <th key={h} style={{ padding: '14px 18px', color: '#64748b', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.5px', textAlign: 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u._id} style={{ borderBottom: '1px solid #1e293b' }}
                onMouseEnter={e => e.currentTarget.style.background = '#0f172a'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '14px 18px', color: 'white', fontWeight: 600 }}>{u.name}</td>
                <td style={{ padding: '14px 18px', color: '#94a3b8', fontSize: '0.88rem' }}>{u.email}</td>
                <td style={{ padding: '14px 18px' }}>
                  <span style={{
                    padding: '3px 10px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 700,
                    background: `${roleColor[u.role] || '#64748b'}22`, color: roleColor[u.role] || '#64748b',
                  }}>{u.role}</span>
                </td>
                <td style={{ padding: '14px 18px' }}>
                  <span style={{ color: u.verified ? '#4ade80' : '#f87171', fontSize: '0.85rem' }}>
                    {u.verified ? '✓ Yes' : '✗ No'}
                  </span>
                </td>
                <td style={{ padding: '14px 18px', color: '#64748b', fontSize: '0.82rem' }}>
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No users found.</div>
        )}
      </div>
    </div>
  );
}

/* ── Main Admin Dashboard ─────────────────────────────────────────────────────── */
export default function AdminDashboard() {
  const [adminUser, setAdminUser] = useState(null);
  const [active, setActive] = useState('dashboard');
  const [stats, setStats] = useState({});

  // Build a simple recent activity feed from verifications + tickets
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    if (!adminUser) return;
    axios.get('/api/admin/stats').then(r => setStats(r.data)).catch(() => {});
    // Build recent activity from multiple sources
    Promise.all([
      axios.get('/api/admin/pending-verifications'),
      axios.get('/api/admin/support-tickets'),
    ]).then(([appsRes, ticketsRes]) => {
      const appEvents = appsRes.data.slice(0, 4).map(u => ({
        icon: u.role === 'doctor' ? '👨‍⚕️' : '🎓',
        text: `New <strong style="color:#60a5fa">${u.role.toUpperCase()}</strong> application submitted — ${u.name}`,
        time: new Date(u.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }));
      const ticketEvents = ticketsRes.data.slice(0, 3).map(t => ({
        icon: '🎫',
        text: `Support ticket opened — <em>"${t.subject}"</em>`,
        time: new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }));
      setRecentActivity([...appEvents, ...ticketEvents].sort(() => 0.5 - Math.random()).slice(0, 6));
    }).catch(() => {});
  }, [adminUser]);

  const handleLogout = () => {
    localStorage.removeItem('admin_user');
    localStorage.removeItem('admin_token');
    sessionStorage.removeItem('admin_user');
    sessionStorage.removeItem('admin_token');
    delete axios.defaults.headers.common['Authorization'];
    setAdminUser(null);
  };

  // If not logged in as admin, show admin login screen
  if (!adminUser) {
    return <AdminLogin onLogin={user => {
      setAdminUser(user);
      axios.defaults.headers.common['Authorization'] = `Bearer ${user.token}`;
    }} />;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0f172a', fontFamily: "'Inter', sans-serif" }}>
      <Sidebar active={active} setActive={setActive} onLogout={handleLogout} admin={adminUser} />

      {/* Main content */}
      <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
        {active === 'dashboard'    && <DashboardHome stats={stats} recentActivity={recentActivity} setActive={setActive} />}
        {active === 'applications' && <Applications />}
        {active === 'tickets'      && <SupportTicketsPanel />}
        {active === 'users'        && <UsersPanel />}
      </div>
    </div>
  );
}
