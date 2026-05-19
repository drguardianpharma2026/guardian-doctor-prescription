import { Link } from 'react-router-dom'

const Header = ({ onLogout }) => {
  return (
    <header className="no-print" style={{
      padding: '0 1rem',
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
      boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
      gap: '0.5rem',
      minWidth: 0,
    }}>
      {/* Logo + Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: 1 }}>
        {/* Guardian 'G' Logo */}
        <div style={{
          width: '38px',
          height: '38px',
          flexShrink: 0,
          background: 'var(--primary)',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '1.2rem',
          fontWeight: 900,
          fontFamily: 'serif',
          boxShadow: '0 4px 10px rgba(21,101,192,0.3)',
        }}>
          G
        </div>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: '0.95rem', marginBottom: '-2px', color: 'var(--primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Guardian Pharmacy</h1>
          <p style={{ fontSize: '0.62rem', color: 'var(--secondary)', fontWeight: 500, letterSpacing: '0.04em' }}>PRESCRIPTION BUILDER</p>
        </div>
      </div>

      {/* Right actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
        {/* Live badge */}
        <div className="header-live-badge" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.35rem 0.65rem',
          background: 'var(--primary-subtle)',
          borderRadius: '999px',
          border: '1px solid rgba(21,101,192,0.15)',
          whiteSpace: 'nowrap',
        }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite', flexShrink: 0 }} />
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--primary)' }}>Live</span>
        </div>

        <Link
          to="/admin-login"
          style={{
            fontSize: '0.82rem',
            fontWeight: '600',
            color: 'var(--secondary)',
            textDecoration: 'none',
            padding: '7px 10px',
            borderRadius: '8px',
            transition: 'background 0.2s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => e.target.style.background = '#f1f5f9'}
          onMouseLeave={(e) => e.target.style.background = 'transparent'}
        >
          Admin
        </Link>

        <button
          onClick={onLogout}
          title="Logout"
          style={{
            background: '#fef2f2',
            color: '#ef4444',
            border: '1px solid #fee2e2',
            padding: '8px',
            borderRadius: '10px',
            fontSize: '0.85rem',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.2s',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#fee2e2'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#fef2f2'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          <span className="logout-text">Logout</span>
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @media (max-width: 400px) {
          .header-live-badge { display: none !important; }
          .logout-text { display: none; }
        }
      `}</style>
    </header>
  );
};

export default Header;
