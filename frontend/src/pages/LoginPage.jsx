import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Auth.css';
import { Stethoscope, ShieldCheck, User as UserIcon, Lock, Mail, User as UserCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';

const LoginPage = ({ setUser, setRole, ROLES }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    userId: '',
    role: ROLES.PATIENT
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
      const response = await axios.post(`http://localhost:5000${endpoint}`, formData);

      if (isLogin) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        setUser(response.data.user);
        setRole(response.data.user.role);
        navigate('/');
      } else {
        setIsLogin(true);
        setError('Account created! Please login.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-section container animate-fade-in">
      <div className="auth-container glass">
        <div className="auth-header">
          <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
          <p>{isLogin ? 'Login to access your prescriptions' : 'Join Prescriptify to start managing health'}</p>
        </div>
        
        {error && (
          <div className={`alert ${error.includes('created') ? 'alert-success' : 'alert-error'}`}>
            {error.includes('created') ? <ShieldCheck size={18} /> : <AlertCircle size={18} />}
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <>
              <div className="form-group">
                <label><UserCircle size={18} /> Full Name</label>
                <input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="John Doe" required />
              </div>
              <div className="form-group">
                <label><UserCircle size={18} /> User ID</label>
                <input type="text" name="userId" value={formData.userId} onChange={handleInputChange} placeholder="PAT-101, DOC-202..." required />
              </div>
              <div className="form-group">
                <label>Identify As</label>
                <select name="role" value={formData.role} onChange={handleInputChange}>
                  <option value={ROLES.PATIENT}>Patient</option>
                  <option value={ROLES.DOCTOR}>Doctor</option>
                  <option value={ROLES.PHARMACIST}>Pharmacist</option>
                </select>
              </div>
            </>
          )}

          <div className="form-group">
            <label><Mail size={18} /> Email Address</label>
            <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="name@example.com" required />
          </div>

          <div className="form-group">
            <label><Lock size={18} /> Password</label>
            <input type="password" name="password" value={formData.password} onChange={handleInputChange} placeholder="••••••••" required />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{marginTop: '10px'}}>
            {loading ? 'Processing...' : isLogin ? 'Login to System' : 'Get Started'}
          </button>
        </form>

        <p className="auth-toggle">
          {isLogin ? "New to Prescriptify?" : "Already an user?"}
          <button onClick={() => setIsLogin(!isLogin)} className="btn-link">
            {isLogin ? 'Sign Up' : 'Login'}
          </button>
        </p>
      </div>
    </section>
  );
};

export default LoginPage;
