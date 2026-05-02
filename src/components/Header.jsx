import React from 'react';

const Header = () => {
  return (
    <header className="no-print" style={{
      padding: '0 1.5rem',
      height: 'var(--header-height, 68px)',
      background: 'white',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      backdropFilter: 'blur(10px)',
      backgroundColor: 'rgba(255,255,255,0.95)',
      boxShadow: '0 1px 8px rgba(0,0,0,0.06)'
    }}>
      {/* Logo + Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Guardian 'G' Logo */}
        <div style={{
          width: '42px',
          height: '42px',
          background: 'var(--primary)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '1.3rem',
          fontWeight: 900,
          fontFamily: 'serif',
          boxShadow: '0 4px 10px rgba(21,101,192,0.3)',
          flexShrink: 0
        }}>
          G
        </div>
        <div>
          <h1 style={{ fontSize: '1.05rem', marginBottom: '-3px', color: 'var(--primary)' }}>Guardian Pharmacy</h1>
          <p style={{ fontSize: '0.7rem', color: 'var(--secondary)', fontWeight: 500, letterSpacing: '0.04em' }}>PRESCRIPTION BUILDER</p>
        </div>
      </div>

      {/* Right badge */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.4rem 0.875rem',
        background: 'var(--primary-subtle)',
        borderRadius: '999px',
        border: '1px solid rgba(21,101,192,0.15)'
      }}>
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }} />
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)' }}>Live</span>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </header>
  );
};

export default Header;
