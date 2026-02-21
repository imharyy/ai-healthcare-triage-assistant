import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { FiUserPlus } from 'react-icons/fi';
import toast from 'react-hot-toast';

const WalkIn = () => {
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [form, setForm] = useState({ name: '', phone: '', email: '', gender: 'male', dateOfBirth: '', department: '', doctor: '', symptoms: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/api/hospitals').then(r => {
      const h = (r.data.data || r.data)?.[0];
      if (h?._id) api.get(`/api/hospitals/${h._id}/departments`).then(d => setDepartments(d.data.data || d.data || []));
    }).catch(() => {});
  }, []);

  const loadDoctors = async (deptId) => {
    setForm(f => ({ ...f, department: deptId, doctor: '' }));
    try {
      const { data } = await api.get(`/api/patients/search-doctors?department=${deptId}`);
      setDoctors(data.data || data || []);
    } catch { setDoctors([]); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/api/receptionist/walk-in', form);
      toast.success('Walk-in patient registered and added to queue');
      setForm({ name: '', phone: '', email: '', gender: 'male', dateOfBirth: '', department: '', doctor: '', symptoms: '' });
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div className="page-header"><h1>Walk-in Registration</h1><p>Register walk-in patients quickly</p></div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group"><label>Full Name *</label><input className="form-control" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
            <div className="form-group"><label>Phone *</label><input className="form-control" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} required /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Email</label><input type="email" className="form-control" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
            <div className="form-group">
              <label>Gender</label>
              <select className="form-control" value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}>
                <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Date of Birth</label><input type="date" className="form-control" value={form.dateOfBirth} onChange={e => setForm({...form, dateOfBirth: e.target.value})} /></div>
            <div className="form-group">
              <label>Department *</label>
              <select className="form-control" value={form.department} onChange={e => loadDoctors(e.target.value)} required>
                <option value="">Select department</option>
                {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Doctor *</label>
              <select className="form-control" value={form.doctor} onChange={e => setForm({...form, doctor: e.target.value})} required>
                <option value="">Select doctor</option>
                {doctors.map(d => <option key={d._id} value={d._id}>Dr. {d.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Symptoms</label><input className="form-control" value={form.symptoms} onChange={e => setForm({...form, symptoms: e.target.value})} placeholder="Brief symptoms..." /></div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
            <FiUserPlus /> {loading ? 'Registering...' : 'Register & Add to Queue'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default WalkIn;
