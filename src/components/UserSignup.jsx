import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/authService';

const UserSignup = ({ onSignup }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    qualification: '',
    consultant: '',
    regNo: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    setLoading(true);
    try {
      await authService.signup(
        formData.name, 
        formData.phone, 
        formData.password,
        {
          qualification: formData.qualification,
          consultant: formData.consultant,
          regNo: formData.regNo
        }
      );
      
      setSuccess(true);
      // Log the user in directly
      onSignup(true);
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      if (err.message.includes('unique')) {
        setError('Phone number already registered');
      } else {
        setError(err.message || 'Signup failed. Please check database connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-illustration-side">
        <img src="/medical_login_illustration_1778484626201.png" alt="Signup Illustration" />
        <div className="illustration-text">
          <h1>Join Our Community</h1>
          <p>Start creating professional prescriptions in minutes with our intuitive builder.</p>
        </div>
      </div>

      <div className="login-form-side">
        <div className="login-form-card">
          <div className="login-header">
            <h2>Create Account</h2>
            <p>Join thousands of doctors using Guardian Pharma.</p>
          </div>

          {success ? (
            <div className="success-message">
              <div className="success-icon">✓</div>
              <h3>Registration Successful!</h3>
              <p>Redirecting you to login...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && <div className="login-error">{error}</div>}

              <div className="login-input-group">
                <label>Full Name</label>
                <input
                  type="text"
                  placeholder="Dr. Your Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="login-input-group">
                <label>Mobile Number</label>
                <input
                  type="tel"
                  placeholder="Enter your mobile number"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>

              <div className="login-input-group">
                <label>Qualification</label>
                <input
                  type="text"
                  placeholder="e.g. MBBS, MD"
                  value={formData.qualification}
                  onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                  required
                />
              </div>

              <div className="login-input-group">
                <label>Consultant Type / Role</label>
                <input
                  type="text"
                  placeholder="e.g. General Physician"
                  value={formData.consultant}
                  onChange={(e) => setFormData({ ...formData, consultant: e.target.value })}
                  required
                />
              </div>

              <div className="login-input-group">
                <label>Medical Reg. No</label>
                <input
                  type="text"
                  placeholder="Reg No"
                  value={formData.regNo}
                  onChange={(e) => setFormData({ ...formData, regNo: e.target.value })}
                  required
                />
              </div>

              <div className="login-input-group">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>

              <button type="submit" className="primary-login-btn" disabled={loading}>
                {loading ? 'Creating Account...' : 'Sign Up'}
              </button>
            </form>
          )}

          <div className="signup-prompt">
            Already have an account? <Link to="/login">Log In</Link>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        /* Inheriting styles from Login for consistency */
        .login-page { display: flex; min-height: 100vh; background: #fff; font-family: 'Outfit', sans-serif; }
        .login-illustration-side { flex: 1.2; background: #f0fdfa; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px; position: relative; overflow: hidden; }
        .login-illustration-side img { width: 80%; max-width: 500px; height: auto; border-radius: 30px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); margin-bottom: 40px; z-index: 2; }
        .illustration-text { text-align: center; max-width: 450px; z-index: 2; }
        .illustration-text h1 { font-size: 2.5rem; color: #0d9488; margin-bottom: 15px; font-weight: 800; }
        .illustration-text p { font-size: 1.1rem; color: #64748b; line-height: 1.6; }
        .login-form-side { flex: 1; display: flex; align-items: center; justify-content: center; padding: 40px; }
        .login-form-card { width: 100%; max-width: 420px; }
        .login-header { margin-bottom: 35px; }
        .login-header h2 { font-size: 2.2rem; font-weight: 800; color: #1e293b; margin-bottom: 8px; }
        .login-header p { color: #64748b; font-size: 1rem; }
        .login-error { background: #fef2f2; color: #991b1b; padding: 12px; border-radius: 12px; margin-bottom: 20px; font-size: 0.9rem; text-align: center; border: 1px solid #fee2e2; font-weight: 600; }
        .login-input-group { margin-bottom: 22px; }
        .login-input-group label { display: block; font-size: 0.875rem; font-weight: 700; color: #475569; margin-bottom: 8px; }
        .login-input-group input { width: 100%; padding: 14px 18px; border: 2px solid #e2e8f0; border-radius: 14px; font-size: 1rem; transition: all 0.2s; outline: none; }
        .login-input-group input:focus { border-color: #0d9488; box-shadow: 0 0 0 4px rgba(13, 148, 136, 0.1); }
        .primary-login-btn { width: 100%; padding: 16px; background: #0d9488; color: white; border: none; border-radius: 14px; font-size: 1.1rem; font-weight: 700; cursor: pointer; transition: all 0.3s; box-shadow: 0 10px 15px -3px rgba(13, 148, 136, 0.3); }
        .primary-login-btn:hover { background: #0f766e; transform: translateY(-2px); box-shadow: 0 15px 20px -5px rgba(13, 148, 136, 0.4); }
        .signup-prompt { text-align: center; margin-top: 25px; color: #64748b; font-size: 0.95rem; }
        .signup-prompt a { color: #0d9488; text-decoration: none; font-weight: 700; }
        
        .success-message { text-align: center; padding: 40px 20px; }
        .success-icon { width: 60px; height: 60px; background: #0d9488; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto 20px; }
        .success-message h3 { font-size: 1.5rem; color: #1e293b; margin-bottom: 10px; }
        .success-message p { color: #64748b; }

        @media (max-width: 1024px) { .login-illustration-side { display: none; } }
      ` }} />
    </div>
  );
};

export default UserSignup;
