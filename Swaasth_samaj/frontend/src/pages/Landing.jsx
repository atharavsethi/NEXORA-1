import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import SplitText from '../components/ui/SplitText';
import SpotlightCard from '../components/ui/SpotlightCard';

export default function Landing() {
  const [loaded, setLoaded] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Search Bar State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    setLoaded(true);
    // Fetch top verified doctors for the homepage
    axios.get('/api/doctors')
      .then(res => {
        if (Array.isArray(res.data)) {
          setDoctors(res.data.slice(0, 4)); // Show top 4
        }
      })
      .catch(err => console.error("Error fetching doctors:", err));
  }, []);

  // Handle Search logic
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    const q = searchQuery.toLowerCase();
    const results = [];
    
    // Feature mapping
    if ('hospitals nearby clinics'.includes(q)) {
      results.push({ type: 'feature', label: 'Nearby Hospitals 🏥', link: '/hospitals', desc: 'Find medical facilities near you' });
    }
    if ('doctors physicians special consultations'.includes(q)) {
      results.push({ type: 'feature', label: 'Doctors Directory 🩺', link: '/doctors', desc: 'Browse all verified doctors' });
    }
    if ('private chat messages consult online'.includes(q)) {
      results.push({ type: 'feature', label: 'Private Consultations 🔒', link: '/private-chats', desc: 'Book a paid 1-on-1 session' });
    }
    if ('forum community questions answers'.includes(q)) {
      results.push({ type: 'feature', label: 'Community Forum 💬', link: '/forum', desc: 'Ask general health queries' });
    }
    if ('doctor lounge private medical'.includes(q)) {
      results.push({ type: 'feature', label: "Doctor's Lounge 👨‍⚕️", link: '/lounge', desc: 'Exclusive space for professionals' });
    }

    // Doctor matching
    doctors.forEach(doc => {
      if ((doc.name && doc.name.toLowerCase().includes(q)) || (doc.specialty && doc.specialty.toLowerCase().includes(q))) {
        results.push({ type: 'doctor', label: doc.name, link: '/doctors', desc: doc.specialty || 'General Physician', id: doc._id });
      }
    });

    setSearchResults(results.slice(0, 6)); // limit to 6
  }, [searchQuery, doctors]);

  // Handle click outside search
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleProtectedAction = (path) => {
    if (!user) {
      navigate('/login');
    } else {
      navigate(path);
    }
  };

  const handleSearchClick = (item) => {
    setShowSearchDropdown(false);
    setSearchQuery('');
    if (item.link === '/private-chats') {
      handleProtectedAction(item.link);
    } else {
      navigate(item.link);
    }
  };

  return (
    <div className="page-wrapper" style={{ background: 'linear-gradient(145deg, #ffffff 0%, #f4f7f6 100%)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* HERO SECTION */}
      <section className="section" style={{ display: 'flex', alignItems: 'center', padding: '60px 0 80px 0', position: 'relative', overflow: 'hidden' }}>
        <div className="container" style={{ width: '100%', position: 'relative', zIndex: 10 }}>
          
          {/* ── GLOBAL SEARCH BAR (At Absolute Top) ── */}
          <div className={`anim-fadeInUp ${loaded ? '' : 'anim-d1'}`} ref={searchRef} style={{ position: 'relative', maxWidth: '700px', margin: '0 auto 60px auto', zIndex: 50 }}>
            <div style={{ 
              display: 'flex', alignItems: 'center', background: 'white', 
              borderRadius: '100px', padding: '12px 24px', border: '2px solid rgba(30,94,255,0.1)',
              boxShadow: '0 15px 35px rgba(0,0,0,0.06)', transition: 'border 0.3s ease'
            }}>
              <span style={{ fontSize: '1.4rem', color: '#94a3b8', marginRight: '14px' }}>🔍</span>
              <input 
                type="text" 
                placeholder="Search doctors, nearby hospitals, forum queries..." 
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setShowSearchDropdown(true); }}
                onFocus={() => setShowSearchDropdown(true)}
                style={{ border: 'none', background: 'transparent', width: '100%', outline: 'none', fontSize: '1.15rem', color: 'var(--secondary)' }}
              />
            </div>

            {/* Search Dropdown */}
            {showSearchDropdown && searchQuery.trim() && (
              <div style={{ 
                position: 'absolute', top: 'calc(100% + 14px)', left: '0', right: '0', 
                background: 'white', borderRadius: '20px', boxShadow: '0 25px 50px rgba(0,0,0,0.12)', 
                border: '1px solid #e2e8f0', zIndex: 100, overflow: 'hidden' 
              }}>
                {searchResults.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '1.05rem' }}>No matches found. Try searching for "hospitals" or "doctors".</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '14px 20px', background: '#f8fafc', fontSize: '0.8rem', fontWeight: 800, color: '#64748b', letterSpacing: '1px', borderBottom: '1px solid #f1f5f9' }}>
                      TOP RESULTS
                    </div>
                    {searchResults.map((item, idx) => (
                      <div key={idx} onClick={() => handleSearchClick(item)} style={{ 
                        padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px',
                        borderBottom: idx < searchResults.length - 1 ? '1px solid #f1f5f9' : 'none',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                      onMouseLeave={e => e.currentTarget.style.background = 'white'}
                      >
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: item.type === 'feature' ? 'rgba(30,94,255,0.1)' : 'rgba(34,197,94,0.1)', color: item.type === 'feature' ? 'var(--primary)' : 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                          {item.type === 'feature' ? '🚀' : '👨‍⚕️'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--secondary)', fontSize: '1.05rem' }}>{item.label}</div>
                          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{item.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '60px', flexWrap: 'wrap', width: '100%' }}>
            
            {/* LEFT SIDE: Text & CTA */}
            <div style={{ flex: '1 1 550px', zIndex: 2 }}>
              <h1 className={`anim-fadeInUp ${loaded ? '' : 'anim-d1'}`} style={{ 
                fontSize: 'clamp(3rem, 6vw, 4.5rem)', 
                lineHeight: '1.1', 
                marginBottom: '20px', 
                color: 'var(--secondary)',
                letterSpacing: '-1px',
                fontWeight: '800'
              }}>
                <SplitText text="Your Health," delay={40} /> <br/>
                <SplitText text="Our Samaj" delay={40} className="text-accent" style={{ color: 'var(--accent)' }} />
              </h1>
              
              <p className={`anim-blurIn ${loaded ? '' : 'anim-d2'}`} style={{ 
                fontSize: '1.25rem', 
                marginBottom: '40px', 
                color: 'var(--text-muted)',
                maxWidth: '520px',
                lineHeight: '1.6'
              }}>
                Join thousands of users getting verified answers from trusted medical professionals, instantly.
              </p>
              
              <div className={`anim-fadeInUp ${loaded ? '' : 'anim-d3'}`} style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '60px' }}>
                <button onClick={() => navigate('/doctors')} className="btn btn-primary" style={{ padding: '16px 32px', fontSize: '1.1rem', borderRadius: 'var(--radius-md)', fontWeight: '600' }}>
                  Ask a Doctor Now
                </button>
                <Link to="/forum" className="btn btn-ghost" style={{ padding: '16px 32px', fontSize: '1.1rem', borderRadius: 'var(--radius-md)', border: '2px solid var(--card-border)', fontWeight: '600' }}>
                  Browse Forum
                </Link>
              </div>

              {/* Floating Stats row */}
              <div className={`anim-fadeInUp ${loaded ? '' : 'anim-d4'}`} style={{ display: 'flex', gap: '40px', flexWrap: 'wrap', marginTop: '20px' }}>
                <div>
                  <h3 style={{ color: 'var(--primary)', fontSize: '2rem', marginBottom: '4px', fontWeight: '800' }}>1,200+</h3>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '500' }}>Verified Doctors</span>
                </div>
                <div>
                  <h3 style={{ color: 'var(--primary)', fontSize: '2rem', marginBottom: '4px', fontWeight: '800' }}>45k+</h3>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '500' }}>Patients Helped</span>
                </div>
                <div>
                  <h3 style={{ color: 'var(--accent)', fontSize: '2rem', marginBottom: '4px', fontWeight: '800' }}>98%</h3>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '500' }}>Satisfaction</span>
                </div>
                <div>
                  <h3 style={{ color: 'var(--primary)', fontSize: '2rem', marginBottom: '4px', fontWeight: '800' }}>200+</h3>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '500' }}>Hospitals</span>
                </div>
              </div>
            </div>

            {/* RIGHT SIDE: Floating Cards UI */}
            <div style={{ flex: '1 1 450px', position: 'relative', height: '100%', minHeight: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }} className={`anim-fadeInUp ${loaded ? '' : 'anim-d4'}`}>
              
              {/* Background Blob */}
              <div style={{ position: 'absolute', top: '20%', right: '-10%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(30, 94, 255, 0.05) 0%, transparent 70%)', zIndex: 1 }}></div>

              <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', maxWidth: '400px' }}>
                
                {/* Card 1: Just Now Activity */}
                <div className="glass-card" style={{ 
                  padding: '24px', 
                  background: 'var(--white)',
                  transform: 'translateX(30px) rotate(2deg)',
                  animation: 'float 6s ease-in-out infinite'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }}></div>
                    <span style={{ color: 'var(--success)', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '1px' }}>JUST NOW</span>
                  </div>
                  <p style={{ color: 'var(--secondary)', fontSize: '1.05rem', lineHeight: '1.5', margin: 0 }}>
                    <span style={{ fontWeight: '700' }}>Dr. Priya Ramesh</span> just answered a cardiac query in under 8 mins. <span style={{ color: 'var(--success)' }}>✔</span>
                  </p>
                </div>

                {/* Card 2: Award */}
                <div className="glass-card" style={{ 
                  padding: '20px 24px', 
                  background: 'var(--white)',
                  transform: 'translateX(-20px) rotate(-1deg)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  animation: 'float 7s ease-in-out infinite reverse'
                }}>
                  <div style={{ width: '50px', height: '50px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                    🏆
                  </div>
                  <div>
                    <h4 style={{ color: 'var(--accent)', margin: '0 0 4px 0', fontSize: '1.1rem' }}>Top Community Award</h4>
                    <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.85rem' }}>Trust Score: 99.4%</p>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* TOP RATED DOCTORS SECTION */}
      <section className="section" style={{ padding: '80px 0', background: 'var(--white)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '50px' }}>
            <h2 style={{ fontSize: '2.5rem', color: 'var(--secondary)', marginBottom: '16px', fontWeight: '800' }}>Top Rated Specialists</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>
              Connect with our highest-rated, verified medical professionals who are ready to help you with private consultations.
            </p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
            {doctors.map(doctor => (
              <div key={doctor._id} className="glass-card" style={{ 
                padding: '30px 24px', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                textAlign: 'center', 
                background: '#f8fafc',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 15px 30px rgba(0,0,0,0.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.05)'; }}
              >
                <div style={{ 
                  width: 90, height: 90, borderRadius: '50%', 
                  background: 'linear-gradient(135deg, var(--primary), #4facfe)', 
                  color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  fontSize: '2.5rem', fontWeight: 800, marginBottom: '20px',
                  boxShadow: '0 10px 20px rgba(30,94,255,0.2)'
                }}>
                  {(doctor.name || '?')[0].toUpperCase()}
                </div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', color: 'var(--secondary)' }}>{doctor.name}</h4>
                <p style={{ margin: '0 0 16px 0', color: 'var(--primary)', fontWeight: '700', fontSize: '0.95rem' }}>{doctor.specialty || 'General Physician'}</p>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: '1.5' }}>
                  {doctor.institution && <div style={{ marginBottom: '6px' }}>🏥 {doctor.institution}</div>}
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(245, 158, 11, 0.1)', padding: '4px 10px', borderRadius: '100px', color: '#d97706', fontWeight: 'bold' }}>
                    ⭐ {doctor.rating || '4.5'} <span style={{ color: 'var(--text-muted)', fontWeight: 'normal', fontSize: '0.8rem' }}>({doctor.reviewCount || 0} reviews)</span>
                  </div>
                </div>
                <button className="btn btn-primary" style={{ width: '100%', marginTop: 'auto', borderRadius: '100px' }} onClick={() => handleProtectedAction('/private-chats')}>
                  Consult Now
                </button>
              </div>
            ))}
          </div>
          
          {doctors.length === 0 && (
             <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>Loading top doctors...</div>
          )}

          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <Link to="/doctors" className="btn btn-ghost" style={{ border: '2px solid var(--primary)', color: 'var(--primary)', fontWeight: 'bold' }}>
              View All Doctors →
            </Link>
          </div>
        </div>
      </section>

      {/* WHY TRUST US SECTION */}
      <section className="section" style={{ padding: '100px 0', background: 'var(--bg-light)', borderTop: '1px solid rgba(0,0,0,0.03)' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', gap: '80px', flexWrap: 'wrap' }}>
          
          {/* LEFT: Content */}
          <div style={{ flex: '1 1 500px' }}>
            <h2 style={{ fontSize: '2.5rem', color: 'var(--secondary)', marginBottom: '24px', fontWeight: '800' }}>Why Should I Trust Swasth Samaj?</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.15rem', marginBottom: '40px', lineHeight: '1.7' }}>
              We've built a health ecosystem where your privacy is guaranteed, and the medical advice you receive comes strictly from verified professionals. Quality over everything.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              {/* Trust Point 1 */}
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(30,94,255,0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1.3rem' }}>✓</div>
                <div>
                  <h4 style={{ margin: '0 0 8px 0', color: 'var(--secondary)', fontSize: '1.15rem' }}>Strict Medical Verification</h4>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '1rem', lineHeight: '1.6' }}>Every doctor and medical student on our platform undergoes a rigorous manual ID, license, and credential check by our admin team before they are allowed to interact with patients.</p>
                </div>
              </div>
              
              {/* Trust Point 2 */}
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(124,58,237,0.1)', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1.3rem' }}>🔒</div>
                <div>
                  <h4 style={{ margin: '0 0 8px 0', color: 'var(--secondary)', fontSize: '1.15rem' }}>Private & Secure Consultations</h4>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '1rem', lineHeight: '1.6' }}>Your private chat consultations are securely stored. Only you and your assigned doctor have access to your personal queries, medical history, and prescribed advice.</p>
                </div>
              </div>

              {/* Trust Point 3 */}
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(34,197,94,0.1)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1.3rem' }}>⭐</div>
                <div>
                  <h4 style={{ margin: '0 0 8px 0', color: 'var(--secondary)', fontSize: '1.15rem' }}>Transparent Patient Reviews</h4>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '1rem', lineHeight: '1.6' }}>All ratings and reviews are purely patient-driven after successful consultations. We guarantee absolute transparency, creating an unbiased top-tier list of providers.</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* RIGHT: Image / Graphic */}
          <div style={{ flex: '1 1 400px', display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: '100%', maxWidth: '420px', position: 'relative' }}>
              <SpotlightCard>
                <div style={{ padding: '40px', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '-15px', right: '-15px', background: 'var(--success)', color: 'white', padding: '12px 24px', borderRadius: '100px', fontWeight: 'bold', fontSize: '1.1rem', boxShadow: '0 10px 25px rgba(34,197,94,0.4)', zIndex: 3 }}>
                    100% Secure ✅
                  </div>
                  
                  <div style={{ width: '100%', height: '220px', borderRadius: '20px', background: 'linear-gradient(135deg, #3b82f6, #60a5fa)', marginBottom: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                    <div style={{ fontSize: '5rem', marginBottom: '10px' }}>🛡️</div>
                    <div style={{ fontWeight: '800', letterSpacing: '2px', opacity: 0.9 }}>VERIFIED NETWORK</div>
                  </div>
                  
                  <h4 style={{ textAlign: 'center', margin: '0 0 12px 0', color: 'var(--secondary)', fontSize: '1.4rem' }}>Our Promise To You</h4>
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', margin: 0, fontSize: '1.05rem', lineHeight: '1.6' }}>We act as an untempered bridge between verified medical expertise and the patients who need it most.</p>
                </div>
              </SpotlightCard>
            </div>
          </div>
          
        </div>
      </section>

      {/* Floating Chat Bubble (Purely decorative for landing page feel) */}
      <div style={{ position: 'fixed', bottom: '30px', right: '30px', width: '60px', height: '60px', borderRadius: '50%', background: 'var(--success)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', boxShadow: '0 10px 25px rgba(34, 197, 94, 0.4)', cursor: 'pointer', zIndex: 99, transition: 'var(--transition)' }} onClick={() => handleProtectedAction('/private-chats')}>
        💬
      </div>
      
    </div>
  );
}
