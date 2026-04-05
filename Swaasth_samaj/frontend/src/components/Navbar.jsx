import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Notification States
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const notifRef = useRef(null);

  const handleLogout = () => { logout(); navigate('/'); setMenuOpen(false); };
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  // Fetch notifications
  useEffect(() => {
    if (!user) { setNotifications([]); return; }
    
    const fetchNotifs = async () => {
      try {
        const res = await axios.get('/api/notifications');
        setNotifications(res.data);
      } catch (err) { console.error('Failed to fetch notifications', err); }
    };
    
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 10000); // poll every 10s
    return () => clearInterval(interval);
  }, [user]);

  // Handle clicking outside the notification dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllRead = async (e) => {
    e.stopPropagation();
    try {
      await axios.patch('/api/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) { console.error(err); }
  };

  const handleNotifClick = async (notif) => {
    try {
      if (!notif.read) {
        await axios.patch(`/api/notifications/${notif._id}/read`);
        setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, read: true } : n));
      }
      setShowNotifDropdown(false);
      if (notif.link) navigate(notif.link);
    } catch (err) { console.error(err); }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const navLinks = [
    { to: '/',          label: 'Home',      icon: '🏠' },
    { to: '/doctors',   label: 'Doctors',   icon: '🩺' },
    { to: '/hospitals', label: 'Nearby Hospitals', icon: '🏥' },
  ];

  return (
    <nav style={{
      position: 'fixed',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '92%',
      maxWidth: '1200px',
      background: 'rgba(255, 255, 255, 0.85)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderRadius: '100px',
      boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
      zIndex: 1000,
      border: '1px solid rgba(255,255,255,0.6)',
      padding: '8px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
      <div className="navbar-inner" style={{ background: 'transparent', boxShadow: 'none', padding: 0, width: '100%' }}>
        {/* Logo */}
        <Link to="/" className="navbar-logo" onClick={() => setMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0, textDecoration: 'none' }}>
          <img src="/logo.png" alt="Swasth Samaj Logo" style={{ height: '52px', width: '52px', objectFit: 'contain', mixBlendMode: 'multiply' }} />
          <span style={{ fontSize: '1.45rem', fontWeight: '800', letterSpacing: '-0.5px' }}>
            <span style={{ color: 'var(--primary)' }}>Swasth</span>
            <span style={{ color: 'var(--accent)' }}>Samaj</span>
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <div className="navbar-links">
          <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>Home</Link>
          <Link to="/doctors" className={`nav-link ${isActive('/doctors') ? 'active' : ''}`}>Doctors</Link>
          <Link to="/hospitals" className={`nav-link ${isActive('/hospitals') ? 'active' : ''}`}>Nearby Hospitals</Link>
          
          <div className="nav-dropdown-container">
            <Link to="/forum" className={`nav-link ${isActive('/forum') || isActive('/lounge') || isActive('/private-chats') ? 'active' : ''}`}>Forum ▾</Link>
            <div className="nav-dropdown-menu">
              <Link to="/forum" className="dropdown-item">💬 Community Q&A</Link>
              <Link to="/lounge" className="dropdown-item">🏥 Doctor's Lounge</Link>
              <Link to="/private-chats" className="dropdown-item">🔒 Private Chat</Link>
            </div>
          </div>

          <Link
            to="/blood-sos"
            className={`nav-link ${isActive('/blood-sos') ? 'active' : ''}`}
            style={{ color: isActive('/blood-sos') ? '#c53030' : '#e53e3e', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            🩸 Blood SOS
          </Link>

          {user && (user.role === 'doctor' || user.role === 'student') && (
            <Link to={user.role === 'student' ? '/student-portal' : '/doctor-portal'} className={`nav-link ${(isActive('/doctor-portal') || isActive('/student-portal')) ? 'active' : ''}`}>Portal</Link>
          )}
          {user && user.role === 'admin' && (
            <Link to="/admin" className={`nav-link ${isActive('/admin') ? 'active' : ''}`}>Admin</Link>
          )}
        </div>

        {/* Auth area */}
        <div className="navbar-auth">
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              
              {/* Notification Bell */}
              <div className="nav-dropdown-container" ref={notifRef} onClick={() => setShowNotifDropdown(!showNotifDropdown)} style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <div style={{ fontSize: '1.4rem', position: 'relative' }}>
                  🔔
                  {unreadCount > 0 && (
                    <span style={{
                      position: 'absolute', top: '-4px', right: '-4px',
                      background: 'var(--danger)', color: 'white',
                      fontSize: '0.65rem', fontWeight: 800,
                      width: '18px', height: '18px', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '2px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
                
                {/* Custom active logic for the dropdown because standard CSS hover won't work perfectly for click-outs */}
                {showNotifDropdown && (
                  <div className="nav-dropdown-menu" style={{ right: 0, left: 'auto', minWidth: '320px', maxWidth: '380px', display: 'block', padding: '0', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                    <div style={{ padding: '14px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>Notifications</span>
                      {unreadCount > 0 && (
                        <button onClick={markAllRead} style={{ fontSize: '0.75rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Mark all as read</button>
                      )}
                    </div>
                    
                    <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                      {notifications.length === 0 ? (
                        <div style={{ padding: '30px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>You have no notifications yet.</div>
                      ) : (
                        notifications.map(n => (
                          <div key={n._id} onClick={() => handleNotifClick(n)} style={{
                            padding: '14px 16px', cursor: 'pointer',
                            borderBottom: '1px solid #f1f5f9',
                            background: n.read ? '#ffffff' : '#f0fdf4',
                            transition: 'background 0.2s',
                            display: 'flex', gap: '12px'
                          }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.read ? 'transparent' : 'var(--success)', marginTop: 6, flexShrink: 0 }}></div>
                            <div>
                              <p style={{ margin: 0, fontSize: '0.88rem', color: n.read ? '#475569' : '#0f172a', lineHeight: 1.5, fontWeight: n.read ? 400 : 500 }}>
                                {n.text}
                              </p>
                              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 4 }}>
                                {new Date(n.createdAt).toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Menu */}
              <div className="nav-dropdown-container" style={{ padding: '8px 0', cursor: 'pointer' }}>
                <div className="user-menu" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="user-avatar">{user.name?.[0]?.toUpperCase() || 'U'}</div>
                  <div className="user-info">
                    <span className="user-name">{user.name}</span>
                    <span className="user-role">{user.role}</span>
                  </div>
                </div>
                <div className="nav-dropdown-menu" style={{ right: 0, left: 'auto', minWidth: '220px' }}>
                  {(user.role === 'doctor' || user.role === 'student') && (
                    <Link to={user.role === 'student' ? '/student-portal' : '/doctor-portal'} className="dropdown-item" style={{ color: 'var(--primary)', fontWeight: 700 }}>🚀 My Dashboard</Link>
                  )}
                  <Link to="/profile" className="dropdown-item">👤 My Profile</Link>
                  <Link to="/faqs" className="dropdown-item">❓ FAQs</Link>
                  <Link to="/help" className="dropdown-item">🎧 Help &amp; Support</Link>
                  <div style={{ height: '1px', background: 'var(--card-border)', margin: '4px 0' }} />
                  <button className="dropdown-item" onClick={handleLogout} style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', color: 'var(--danger)' }}>
                    🚪 Logout
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <>
              <Link to="/login" className="btn btn-primary btn-sm">Login</Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button className="nav-hamburger" onClick={() => setMenuOpen(o => !o)} aria-label="Menu">
          <span /><span /><span />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="mobile-menu">
          {navLinks.map(l => (
            <Link key={l.to} to={l.to} className="mobile-link" onClick={() => setMenuOpen(false)}>
              {l.icon} {l.label}
            </Link>
          ))}
          <Link to="/blood-sos" className="mobile-link" onClick={() => setMenuOpen(false)} style={{ color: '#e53e3e', fontWeight: 700 }}>
            🩸 Blood SOS
          </Link>
          {user ? (
            <>
              <div className="mobile-user">👤 {user.name} ({user.role})</div>
              <Link to="/profile" className="mobile-link" onClick={() => setMenuOpen(false)}>👤 My Profile</Link>
              <Link to="/faqs" className="mobile-link" onClick={() => setMenuOpen(false)}>❓ FAQs</Link>
              <Link to="/help" className="mobile-link" onClick={() => setMenuOpen(false)}>🎧 Help & Support</Link>
              <button className="btn btn-danger btn-sm" onClick={handleLogout} style={{ margin: '10px 16px' }}>Logout</button>
            </>
          ) : (
            <div style={{ padding: '10px 16px', display: 'flex', gap: 8 }}>
              <Link to="/login" className="btn btn-primary btn-sm" onClick={() => setMenuOpen(false)}>Login</Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
