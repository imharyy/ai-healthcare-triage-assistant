import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { FiSettings, FiSave } from 'react-icons/fi';
import toast from 'react-hot-toast';

const HospitalSettings = () => {
  const [hospital, setHospital] = useState(null);
  const [form, setForm] = useState({ name: '', address: '', phone: '', email: '', operatingHours: { open: '08:00', close: '20:00' } });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/hospitals').then(r => {
      const h = (r.data.data || r.data)?.[0];
      if (h) {
        setHospital(h);
        setForm({
          name: h.name || '', address: h.address || '',
          phone: h.phone || '', email: h.email || '',
          operatingHours: h.operatingHours || { open: '08:00', close: '20:00' }
        });
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!hospital) return;
    try {
      await api.put(`/api/hospitals/${hospital._id}`, form);
      toast.success('Hospital settings saved');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header flex justify-between items-center">
        <div><h1>Hospital Settings</h1><p>Manage hospital information</p></div>
        <button className="btn btn-primary" onClick={save}><FiSave /> Save</button>
      </div>

      <div className="card">
        <div className="form-group"><label>Hospital Name</label><input className="form-control" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
        <div className="form-group"><label>Address</label><textarea className="form-control" value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
        <div className="form-row">
          <div className="form-group"><label>Phone</label><input className="form-control" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
          <div className="form-group"><label>Email</label><input className="form-control" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>Opening Time</label><input type="time" className="form-control" value={form.operatingHours.open} onChange={e => setForm({...form, operatingHours: {...form.operatingHours, open: e.target.value}})} /></div>
          <div className="form-group"><label>Closing Time</label><input type="time" className="form-control" value={form.operatingHours.close} onChange={e => setForm({...form, operatingHours: {...form.operatingHours, close: e.target.value}})} /></div>
        </div>
      </div>

      {hospital && (
        <div className="card mt-4">
          <h3 className="card-title mb-3">Hospital Stats</h3>
          <div className="grid-3">
            <div style={{padding:'16px',background:'var(--gray-50)',borderRadius:'8px',textAlign:'center'}}>
              <h3>{hospital.beds?.total || 0}</h3><p style={{fontSize:'13px',color:'var(--gray-500)'}}>Total Beds</p>
            </div>
            <div style={{padding:'16px',background:'var(--gray-50)',borderRadius:'8px',textAlign:'center'}}>
              <h3>{hospital.beds?.available || 0}</h3><p style={{fontSize:'13px',color:'var(--gray-500)'}}>Available Beds</p>
            </div>
            <div style={{padding:'16px',background:'var(--gray-50)',borderRadius:'8px',textAlign:'center'}}>
              <h3>⭐ {hospital.rating?.toFixed(1) || 'N/A'}</h3><p style={{fontSize:'13px',color:'var(--gray-500)'}}>Hospital Rating</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HospitalSettings;
