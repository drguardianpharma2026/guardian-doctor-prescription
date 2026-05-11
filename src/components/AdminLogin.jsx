import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const AdminLogin = ({ onLogin }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    
    // Using Environment Variables (Set these in Vercel Dashboard)
    const adminEmail = import.meta.env.VITE_ADMIN_EMAIL
    const adminPass = import.meta.env.VITE_ADMIN_PASSWORD

    // Debugging check (won't show in production unless env is missing)
    if (!adminEmail || !adminPass) {
      setError('System Error: Environment Variables not configured on Live Server.')
      console.error('VITE_ADMIN_EMAIL or VITE_ADMIN_PASSWORD is missing in environment.')
      return
    }

    if (email === adminEmail && password === adminPass) {
      onLogin(true)
      navigate('/admin')
    } else {
      setError('Invalid Access Credentials')
    }
  }

  return (
    <div className="login-page">
      <div className="login-illustration-side admin-theme">
        <img src="/medical_login_illustration_1778484626201.png" alt="Admin Illustration" />
        <div className="illustration-text">
          <h1>Guardian Admin</h1>
          <p>Secure management portal for healthcare professionals. Manage medicines, inventory, and clinic settings.</p>
        </div>
      </div>

      <div className="login-form-side">
        <div className="login-form-card">
          <div className="login-header">
            <h2>Sign In</h2>
            <p>Access your administrator dashboard</p>
          </div>

          <form onSubmit={handleSubmit}>
            {error && <div className="login-error">{error}</div>}
            
            <div className="login-input-group">
              <label>Administrator ID</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="email@example.com"
                required 
              />
            </div>

            <div className="login-input-group">
              <label>Security Key</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••"
                required 
              />
            </div>

            <button type="submit" className="primary-login-btn admin-btn">
              Authenticate
            </button>
          </form>

          <button onClick={() => navigate('/')} className="exit-btn">
            ← Back to Application
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .login-page {
          display: flex;
          min-height: 100vh;
          background: white;
          font-family: 'Outfit', sans-serif;
        }

        .login-illustration-side {
          flex: 1.2;
          background: #f0fdfa;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px;
          position: relative;
          overflow: hidden;
        }
        
        .login-illustration-side.admin-theme {
          background: #eff6ff; /* Soft blue for admin */
        }

        .login-illustration-side img {
          width: 80%;
          max-width: 500px;
          height: auto;
          border-radius: 30px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          margin-bottom: 40px;
          z-index: 2;
        }

        .illustration-text {
          text-align: center;
          max-width: 450px;
          z-index: 2;
        }

        .illustration-text h1 {
          font-size: 2.5rem;
          color: #1e40af;
          margin-bottom: 15px;
          font-weight: 800;
        }

        .illustration-text p {
          font-size: 1.1rem;
          color: #64748b;
          line-height: 1.6;
        }

        .login-form-side {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
          background: #ffffff;
        }

        .login-form-card {
          width: 100%;
          max-width: 420px;
        }

        .login-header { margin-bottom: 35px; }
        .login-header h2 { font-size: 2.2rem; font-weight: 800; color: #1e293b; margin-bottom: 8px; }
        .login-header p { color: #64748b; font-size: 1rem; }

        .login-error {
          background: #fef2f2;
          color: #991b1b;
          padding: 12px;
          border-radius: 12px;
          margin-bottom: 20px;
          font-size: 0.9rem;
          text-align: center;
          border: 1px solid #fee2e2;
          font-weight: 600;
        }

        .login-input-group { margin-bottom: 22px; }
        .login-input-group label { display: block; font-size: 0.875rem; font-weight: 700; color: #475569; margin-bottom: 8px; }
        .login-input-group input {
          width: 100%;
          padding: 14px 18px;
          border: 2px solid #e2e8f0;
          border-radius: 14px;
          font-size: 1rem;
          transition: all 0.2s;
          outline: none;
        }
        .login-input-group input:focus {
          border-color: #1d4ed8;
          box-shadow: 0 0 0 4px rgba(29, 78, 216, 0.1);
        }

        .primary-login-btn {
          width: 100%;
          padding: 16px;
          background: #1e40af;
          color: white;
          border: none;
          border-radius: 14px;
          font-size: 1.1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 10px 15px -3px rgba(30, 64, 175, 0.3);
        }

        .primary-login-btn:hover {
          background: #1e3a8a;
          transform: translateY(-2px);
          box-shadow: 0 15px 20px -5px rgba(30, 64, 175, 0.4);
        }

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
        .exit-btn:hover { color: #1e40af; }

        @media (max-width: 1024px) {
          .login-illustration-side { display: none; }
        }
      ` }} />
    </div>
  )
}

export default AdminLogin
