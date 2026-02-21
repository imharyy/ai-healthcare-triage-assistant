import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FiHeart, FiUser, FiMail, FiLock, FiPhone } from 'react-icons/fi';
import toast from 'react-hot-toast';
import './Auth.css';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', gender: 'male', dateOfBirth: '', bloodGroup: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register({ ...form, role: 'patient' });
      toast.success('Registration successful!');
      navigate('/patient/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <FiHeart className="auth-logo" />
          <h1>Create Account</h1>
          <p>Join HealHub today</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <div className="input-icon"><FiUser /><input className="form-control" placeholder="Full name" value={form.name} onChange={set('name')} required /></div>
          </div>
          <div className="auth-form-row">
            <div className="form-group">
              <label>Email</label>
              <div className="input-icon"><FiMail /><input type="email" className="form-control" placeholder="Email" value={form.email} onChange={set('email')} required /></div>
            </div>
            <div className="form-group">
              <label>Phone</label>
              <div className="input-icon"><FiPhone /><input className="form-control" placeholder="Phone" value={form.phone} onChange={set('phone')} required /></div>
            </div>
          </div>
          <div className="form-group">
            <label>Password</label>
            <div className="input-icon"><FiLock /><input type="password" className="form-control" placeholder="Min 6 characters" value={form.password} onChange={set('password')} required minLength={6} /></div>
          </div>
          <div className="auth-form-row">
            <div className="form-group">
              <label>Gender</label>
              <select className="form-control" value={form.gender} onChange={set('gender')}>
                <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label>Date of Birth</label>
              <input type="date" className="form-control" value={form.dateOfBirth} onChange={set('dateOfBirth')} required />
            </div>
          </div>
          <div className="form-group">
            <label>Blood Group</label>
            <select className="form-control" value={form.bloodGroup} onChange={set('bloodGroup')}>
              <option value="">Select</option>
              {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </form>
        <p className="auth-link">Already have an account? <Link to="/login">Sign In</Link></p>
      </div>
    </div>
  );
};

export default Register;
