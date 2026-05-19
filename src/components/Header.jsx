import { Link } from 'react-router-dom'

const Header = ({ onLogout }) => {
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

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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

        <Link 
          to="/admin-login"
          style={{
            fontSize: '0.85rem',
            fontWeight: '600',
            color: 'var(--secondary)',
            textDecoration: 'none',
            padding: '8px 12px',
            borderRadius: '8px',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.background = '#f1f5f9'}
          onMouseLeave={(e) => e.target.style.background = 'transparent'}
        >
          Admin
        </Link>

        <button 
          onClick={onLogout}
          style={{
            background: '#fef2f2',
            color: '#ef4444',
            border: '1px solid #fee2e2',
            padding: '8px 16px',
            borderRadius: '10px',
            fontSize: '0.85rem',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.background = '#fee2e2'}
          onMouseLeave={(e) => e.target.style.background = '#fef2f2'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Logout
        </button>
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
