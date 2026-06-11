import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/authService';

const UserLogin = ({ onLogin }) => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await authService.login(phone, password);

      if (user) {
        localStorage.setItem('logged_in_user', JSON.stringify(user));
        onLogin(true);
        navigate('/');
      } else {
        setError('Invalid phone number or password');
      }
    } catch (err) {
      setError(err.message || 'Connection to database failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-illustration-side">
        <img src="/medical_login_illustration_1778484626201.png" alt="Login Illustration" />
        <div className="illustration-text">
          <h1>Guardian Prescription Builder</h1>
          <p>Streamline your clinic with our premium prescription tools.</p>
        </div>
      </div>

      <div className="login-form-side">
        <div className="login-form-card">
          <div className="login-header">
            <h2>Login</h2>
            <p>Welcome back! Please enter your details.</p>
          </div>

          <form onSubmit={handleSubmit}>
            {error && <div className="login-error">{error}</div>}

            <div className="login-input-group">
              <label>Mobile Number</label>
              <input
                type="tel"
                placeholder="Enter your mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>

            <div className="login-input-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="login-options">
              <label className="remember-me">
                <input type="checkbox" /> Remember me
              </label>
              <a href="#" className="forgot-password">Forgot Password?</a>
            </div>

            <button type="submit" className="primary-login-btn" disabled={loading}>
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </form>

          <div className="signup-prompt">
            Don't have an account? <Link to="/signup">Sign Up</Link>
          </div>

          <div className="signup-prompt" style={{ marginTop: '10px', display: 'flex', gap: '15px', justifyContent: 'center' }}>
            <Link to="/staff" style={{ color: '#0d9488', fontSize: '0.85rem', fontWeight: 700 }}>📋 Staff Dashboard</Link>
            <Link to="/admin-login" style={{ color: '#64748b', fontSize: '0.85rem', opacity: 0.7 }}>🔐 Admin Portal</Link>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .login-page {
          display: flex;
          min-height: 100vh;
          background: #ffffff;
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
          color: #0d9488;
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

        .login-header {
          margin-bottom: 35px;
        }

        .login-header h2 {
          font-size: 2.2rem;
          font-weight: 800;
          color: #1e293b;
          margin-bottom: 8px;
        }

        .login-header p {
          color: #64748b;
          font-size: 1rem;
        }

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

        .login-input-group {
          margin-bottom: 22px;
        }

        .login-input-group label {
          display: block;
          font-size: 0.875rem;
          font-weight: 700;
          color: #475569;
          margin-bottom: 8px;
        }

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
          border-color: #0d9488;
          box-shadow: 0 0 0 4px rgba(13, 148, 136, 0.1);
        }

        .login-options {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          font-size: 0.9rem;
        }

        .remember-me {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #64748b;
          cursor: pointer;
        }

        .forgot-password {
          color: #0d9488;
          text-decoration: none;
          font-weight: 600;
        }

        .primary-login-btn {
          width: 100%;
          padding: 16px;
          background: #0d9488;
          color: white;
          border: none;
          border-radius: 14px;
          font-size: 1.1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 10px 15px -3px rgba(13, 148, 136, 0.3);
        }

        .primary-login-btn:hover {
          background: #0f766e;
          transform: translateY(-2px);
          box-shadow: 0 15px 20px -5px rgba(13, 148, 136, 0.4);
        }

        .signup-prompt {
          text-align: center;
          margin-top: 25px;
          color: #64748b;
          font-size: 0.95rem;
        }

        .signup-prompt a {
          color: #0d9488;
          text-decoration: none;
          font-weight: 700;
        }

        .login-divider {
          display: flex;
          align-items: center;
          margin: 30px 0;
          color: #94a3b8;
          font-size: 0.85rem;
        }

        .login-divider::before,
        .login-divider::after {
          content: "";
          flex: 1;
          height: 1px;
          background: #e2e8f0;
        }

        .login-divider span {
          padding: 0 15px;
        }

        .social-login-btns {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }

        .social-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 12px;
          border: 2px solid #e2e8f0;
          border-radius: 14px;
          background: white;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s;
        }

        .social-btn img {
          width: 20px;
          height: 20px;
        }

        .social-btn:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
        }

        @media (max-width: 1024px) {
          .login-illustration-side {
            display: none;
          }
        }
      ` }} />
    </div>
  );
};

export default UserLogin;
