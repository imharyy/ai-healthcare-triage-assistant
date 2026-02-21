import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FiHeart, FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import toast from 'react-hot-toast';
import './Auth.css';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await login(form.email, form.password);
      toast.success('Welcome back!');
      const role = data.user?.role;
      const map = { patient: '/patient/dashboard', doctor: '/doctor/dashboard', receptionist: '/receptionist/dashboard', admin: '/admin/dashboard', superadmin: '/admin/dashboard' };
      navigate(map[role] || '/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <FiHeart className="auth-logo" />
          <h1>HealHub</h1>
          <p>Healthcare Management System</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <div className="input-icon">
              <FiMail />
              <input type="email" className="form-control" placeholder="Enter email" value={form.email}
                onChange={e => setForm({...form, email: e.target.value})} required />
            </div>
          </div>
          <div className="form-group">
            <label>Password</label>
            <div className="input-icon">
              <FiLock />
              <input type={showPwd ? 'text' : 'password'} className="form-control" placeholder="Enter password"
                value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
              <button type="button" className="pwd-toggle" onClick={() => setShowPwd(!showPwd)}>
                {showPwd ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="auth-link">Don't have an account? <Link to="/register">Register</Link></p>
        <div className="demo-credentials">
          <h4>Demo Accounts</h4>
          <div className="demo-list">
            <button onClick={() => setForm({ email: 'admin@healhub.com', password: 'admin123' })}>Admin</button>
            <button onClick={() => setForm({ email: 'dr.rajesh@healhub.com', password: 'doctor123' })}>Doctor</button>
            <button onClick={() => setForm({ email: 'receptionist@healhub.com', password: 'recep123' })}>Receptionist</button>
            <button onClick={() => setForm({ email: 'rahul@test.com', password: 'patient123' })}>Patient</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
