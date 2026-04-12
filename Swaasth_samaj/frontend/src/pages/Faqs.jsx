import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function Faqs() {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    axios.get('/api/faqs')
      .then(res => setFaqs(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="spinner" style={{ margin: '150px auto' }} />;

  return (
    <div className="page-wrapper container" style={{ maxWidth: '800px', paddingBottom: '60px' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '16px' }}>❓ Frequently Asked Questions</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Find answers to common questions about Swasth Samaj.</p>
      </div>

      {faqs.length === 0 ? (
        <div className="empty-state glass-card">
          <h4>No FAQs available at the moment.</h4>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {faqs.map(faq => {
            const isOpen = openId === faq._id;
            return (
              <div key={faq._id} className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                <button 
                  onClick={() => setOpenId(isOpen ? null : faq._id)}
                  style={{
                    width: '100%', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                    fontSize: '1.05rem', fontWeight: 600, color: 'var(--secondary)'
                  }}
                >
                  <span>{faq.question}</span>
                  <span style={{ fontSize: '1.2rem', color: 'var(--primary)', transform: isOpen ? 'rotate(45deg)' : 'none', transition: 'all 0.2s' }}>
                    +
                  </span>
                </button>
                {isOpen && (
                  <div style={{ padding: '0 24px 24px 24px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                    <div style={{ paddingTop: '16px', borderTop: '1px solid var(--card-border)' }}>
                      {faq.answer}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
