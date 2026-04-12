import React, { useEffect, useState } from 'react';

export default function SplitText({ text, delay = 50, className = '' }) {
  const [mounted, setMounted] = useState(false);
  const words = text.split(' ');

  useEffect(() => {
    // Small delay before starting the animation
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <span className={className} style={{ display: 'inline-block' }}>
      {words.map((word, i) => (
        <span
          key={i}
          style={{
            display: 'inline-block',
            overflow: 'hidden',
            paddingRight: '0.25em',
            verticalAlign: 'bottom',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              transform: mounted ? 'translateY(0)' : 'translateY(100%)',
              opacity: mounted ? 1 : 0,
              transition: `transform 0.6s cubic-bezier(0.22, 1, 0.36, 1) ${i * delay}ms, opacity 0.6s ease ${i * delay}ms`,
            }}
          >
            {word}
          </span>
        </span>
      ))}
    </span>
  );
}
