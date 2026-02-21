import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { FiLayers, FiPlus, FiAlertTriangle } from 'react-icons/fi';
import toast from 'react-hot-toast';

const BedManagement = () => {
  const [beds, setBeds] = useState([]);
  const [tab, setTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ bedNumber: '', ward: 'general', floor: 1, type: 'general' });

  const load = async () => {
    try {
      const params = tab !== 'all' ? `?status=${tab}` : '';
      const { data } = await api.get(`/api/receptionist/beds${params}`);
      setBeds(data.data || data || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [tab]);

  const addBed = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/receptionist/beds', form);
      toast.success('Bed added');
      setShowAdd(false);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/api/receptionist/beds/${id}`, { status });
      toast.success('Bed updated');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const emergencyAllocate = async () => {
    try {
      const availableBed = beds.find(b => b.status === 'available');
      if (!availableBed) { toast.error('No beds available'); return; }
      const { data } = await api.post(`/api/receptionist/beds/${availableBed._id}/emergency-allocate`);
      toast.success(`Bed ${data.data?.bedNumber || availableBed.bedNumber || ''} allocated for emergency`);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'No beds available'); }
  };

  const statusColors = { available: 'badge-success', occupied: 'badge-danger', reserved: 'badge-warning', maintenance: 'badge-gray' };

  return (
    <div>
      <div className="page-header flex justify-between items-center">
        <div><h1>Bed Management</h1><p>Hospital bed allocation</p></div>
        <div className="flex gap-2">
          <button className="btn btn-danger" onClick={emergencyAllocate}><FiAlertTriangle /> Emergency Allocate</button>
          <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)}><FiPlus /> Add Bed</button>
        </div>
      </div>

      {showAdd && (
        <div className="card mb-4">
          <form onSubmit={addBed}>
            <div className="form-row">
              <div className="form-group"><label>Bed Number</label><input className="form-control" value={form.bedNumber} onChange={e => setForm({...form, bedNumber: e.target.value})} required /></div>
              <div className="form-group"><label>Ward</label>
                <select className="form-control" value={form.ward} onChange={e => setForm({...form, ward: e.target.value})}>
                  <option value="general">General</option><option value="icu">ICU</option><option value="private">Private</option><option value="semi-private">Semi-Private</option><option value="emergency">Emergency</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Floor</label><input type="number" className="form-control" value={form.floor} onChange={e => setForm({...form, floor: e.target.value})} /></div>
              <div className="form-group"><label>Type</label>
                <select className="form-control" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                  <option value="general">General</option><option value="icu">ICU</option><option value="ventilator">Ventilator</option><option value="pediatric">Pediatric</option>
                </select>
              </div>
            </div>
            <button type="submit" className="btn btn-primary">Add Bed</button>
          </form>
        </div>
      )}

      <div className="tabs mb-4">
        {['all', 'available', 'occupied', 'reserved', 'maintenance'].map(t => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => { setTab(t); setLoading(true); }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {loading ? <div className="loading-page"><div className="spinner"></div></div> :
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:'12px'}}>
          {beds.map(bed => (
            <div key={bed._id} className="card text-center" style={{padding:'16px'}}>
              <FiLayers style={{fontSize:'24px',marginBottom:'8px',color: bed.status === 'available' ? 'var(--success)' : 'var(--gray-400)'}} />
              <h4>Bed {bed.bedNumber}</h4>
              <p style={{fontSize:'12px',color:'var(--gray-500)'}}>{bed.ward} • Floor {bed.floor}</p>
              <span className={`badge ${statusColors[bed.status]} mt-2`}>{bed.status}</span>
              {bed.patient && <p style={{fontSize:'12px',marginTop:'8px'}}>Patient: {bed.patient.name}</p>}
              <div className="flex gap-1 mt-3 justify-center">
                {bed.status !== 'available' && <button className="btn btn-sm btn-success" onClick={() => updateStatus(bed._id, 'available')}>Free</button>}
                {bed.status === 'available' && <button className="btn btn-sm btn-warning" onClick={() => updateStatus(bed._id, 'reserved')}>Reserve</button>}
              </div>
            </div>
          ))}
        </div>
      }
    </div>
  );
};

export default BedManagement;
