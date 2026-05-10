import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const AdminLogin = ({ onLogin }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Using Environment Variables (Set these in Vercel Dashboard)
    const adminEmail = import.meta.env.VITE_ADMIN_EMAIL
    const adminPass = import.meta.env.VITE_ADMIN_PASSWORD

    if (email === adminEmail && password === adminPass) {
      onLogin(true)
      navigate('/admin')
    } else {
      setError('Invalid Access Credentials')
    }
  }

  return (
    <div className="login-container">
      <div className="login-visual">
        <div className="visual-content">
          <div className="visual-logo">G</div>
          <h1>Guardian Admin</h1>
          <p>Secure management portal for healthcare professionals.</p>
        </div>
        <div className="visual-footer">
          © 2026 Guardian Pharma
        </div>
      </div>

      <div className="login-form-area">
        <div className="form-card">
          <div className="form-header">
            <h2>Sign In</h2>
            <p>Access your dashboard</p>
          </div>

          <form onSubmit={handleSubmit}>
            {error && <div className="error-badge">{error}</div>}
            
            <div className="input-group">
              <label>Administrator ID</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="email@example.com"
                required 
              />
            </div>

            <div className="input-group">
              <label>Security Key</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••"
                required 
              />
            </div>

            <button type="submit" className="login-btn">
              Authenticate
            </button>
          </form>

          <button onClick={() => navigate('/')} className="exit-btn">
            ← Back to Application
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .login-container {
          min-height: 100vh;
          display: flex;
          background: white;
          font-family: 'Outfit', sans-serif;
        }

        .login-visual {
          flex: 1.2;
          background: #1565C0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 60px;
          color: white;
          position: relative;
          overflow: hidden;
        }
        .login-visual::before {
          content: '';
          position: absolute;
          top: -100px;
          right: -100px;
          width: 400px;
          height: 400px;
          background: rgba(255,255,255,0.05);
          border-radius: 50%;
        }

        .visual-logo {
          width: 60px;
          height: 60px;
          background: white;
          color: #1565C0;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 2rem;
          margin-bottom: 30px;
        }
        .visual-content h1 { font-size: 3rem; margin: 0 0 15px; font-weight: 800; }
        .visual-content p { font-size: 1.2rem; opacity: 0.8; max-width: 400px; line-height: 1.6; }
        .visual-footer { position: absolute; bottom: 40px; font-size: 0.9rem; opacity: 0.6; }

        .login-form-area {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
          background: #f8fafc;
        }
        .form-card { width: 100%; max-width: 400px; }
        
        .form-header { margin-bottom: 40px; }
        .form-header h2 { font-size: 2rem; margin: 0 0 10px; color: #1e293b; font-weight: 800; }
        .form-header p { color: #64748b; margin: 0; }

        .error-badge {
          background: #fef2f2;
          color: #991b1b;
          padding: 12px;
          border-radius: 10px;
          font-size: 0.9rem;
          margin-bottom: 25px;
          border: 1px solid #fee2e2;
          font-weight: 600;
          text-align: center;
        }

        .input-group { margin-bottom: 20px; }
        .input-group label { display: block; font-size: 0.85rem; font-weight: 700; color: #475569; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em; }
        .input-group input {
          width: 100%;
          padding: 14px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-size: 1rem;
          outline: none;
          transition: all 0.2s;
          background: white;
        }
        .input-group input:focus { border-color: #1565C0; box-shadow: 0 0 0 4px rgba(21, 101, 192, 0.1); }

        .login-btn {
          width: 100%;
          background: #1565C0;
          color: white;
          border: none;
          padding: 16px;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          margin-top: 10px;
          transition: all 0.2s;
          box-shadow: 0 10px 15px -3px rgba(21, 101, 192, 0.2);
        }
        .login-btn:hover { background: #0d47a1; transform: translateY(-2px); }
        .login-btn:active { transform: translateY(0); }

        .exit-btn {
          width: 100%;
          background: none;
          border: none;
          color: #94a3b8;
          font-size: 0.9rem;
          cursor: pointer;
          margin-top: 30px;
          font-weight: 600;
        }
        .exit-btn:hover { color: #1565C0; }

        @media (max-width: 900px) {
          .login-visual { display: none; }
          .login-form-area { background: white; }
        }
      ` }} />
    </div>
  )
}

export default AdminLogin
