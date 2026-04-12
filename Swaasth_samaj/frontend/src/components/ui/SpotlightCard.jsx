import React, { useState, useRef } from 'react';

export default function SpotlightCard({ children, className = '' }) {
  const divRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsFocused(true)}
      onMouseLeave={() => setIsFocused(false)}
      className={className}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '24px',
        padding: '3px', // Border gradient thickness
        background: 'rgba(255, 255, 255, 1)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.06)',
        transition: 'transform 0.3s ease',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = 'translateY(-5px)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Dynamic border/glow effect */}
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: `radial-gradient(800px circle at ${position.x}px ${position.y}px, rgba(59,130,246,0.15), transparent 40%)`,
          opacity: isFocused ? 1 : 0,
          transition: 'opacity 0.4s ease',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      
      {/* Inner card content wrapper */}
      <div style={{ position: 'relative', zIndex: 1, background: 'white', borderRadius: '21px', height: '100%' }}>
        {children}
      </div>
    </div>
  );
}
