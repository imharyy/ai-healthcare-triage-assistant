import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { FiPlus, FiAlertCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';

const DoctorPrescriptions = () => {
  const [show, setShow] = useState(false);
  const [patients, setPatients] = useState([]);
  const [drugs, setDrugs] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [form, setForm] = useState({
    patient: '', diagnosis: '', medications: [{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }],
    investigations: '', advice: '', followUpDate: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/api/doctors/my-patients').then(r => setPatients(r.data.data || r.data || [])).catch(() => {});
    api.get('/api/prescriptions/drugs').then(r => setDrugs(r.data.data || r.data || [])).catch(() => {});
  }, []);

  const addMed = () => setForm({ ...form, medications: [...form.medications, { name: '', dosage: '', frequency: '', duration: '', instructions: '' }] });
  const removeMed = (i) => setForm({ ...form, medications: form.medications.filter((_, idx) => idx !== i) });
  const updateMed = (i, field, val) => {
    const meds = [...form.medications];
    meds[i] = { ...meds[i], [field]: val };
    setForm({ ...form, medications: meds });
  };

  const checkInteractions = async () => {
    const names = form.medications.map(m => m.name).filter(Boolean);
    if (names.length < 2) return;
    try {
      const { data } = await api.post('/api/prescriptions/check-interactions', { drugs: names });
      setInteractions(data.data || data.interactions || []);
    } catch {}
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/api/prescriptions', form);
      toast.success('Prescription created');
      setShow(false);
      setForm({ patient: '', diagnosis: '', medications: [{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }], investigations: '', advice: '', followUpDate: '' });
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div className="page-header flex justify-between items-center">
        <div><h1>Prescriptions</h1><p>Create and manage e-prescriptions</p></div>
        <button className="btn btn-primary" onClick={() => setShow(!show)}><FiPlus /> New Prescription</button>
      </div>

      {show && (
        <div className="card mb-4">
          <form onSubmit={submit}>
            <div className="form-row">
              <div className="form-group">
                <label>Patient</label>
                <select className="form-control" value={form.patient} onChange={e => setForm({...form, patient: e.target.value})} required>
                  <option value="">Select patient</option>
                  {patients.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Diagnosis</label>
                <input className="form-control" value={form.diagnosis} onChange={e => setForm({...form, diagnosis: e.target.value})} required />
              </div>
            </div>

            <h4 style={{marginBottom:'12px'}}>Medications</h4>
            {form.medications.map((med, i) => (
              <div key={i} style={{padding:'12px',background:'var(--gray-50)',borderRadius:'8px',marginBottom:'8px'}}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Drug Name</label>
                    <select className="form-control" value={med.name} onChange={e => { updateMed(i, 'name', e.target.value); }}>
                      <option value="">Select drug</option>
                      {drugs.map(d => <option key={d.name || d} value={d.name || d}>{d.name || d}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Dosage</label>
                    <input className="form-control" placeholder="e.g., 500mg" value={med.dosage} onChange={e => updateMed(i, 'dosage', e.target.value)} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Frequency</label>
                    <select className="form-control" value={med.frequency} onChange={e => updateMed(i, 'frequency', e.target.value)}>
                      <option value="">Select</option>
                      <option value="once-daily">Once Daily</option>
                      <option value="twice-daily">Twice Daily</option>
                      <option value="thrice-daily">Thrice Daily</option>
                      <option value="as-needed">As Needed</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Duration</label>
                    <input className="form-control" placeholder="e.g., 7 days" value={med.duration} onChange={e => updateMed(i, 'duration', e.target.value)} />
                  </div>
                </div>
                {form.medications.length > 1 && <button type="button" className="btn btn-sm btn-danger mt-2" onClick={() => removeMed(i)}>Remove</button>}
              </div>
            ))}
            <div className="flex gap-2 mb-3">
              <button type="button" className="btn btn-sm btn-secondary" onClick={addMed}><FiPlus /> Add Medication</button>
              <button type="button" className="btn btn-sm btn-outline" onClick={checkInteractions}>Check Interactions</button>
            </div>

            {interactions.length > 0 && (
              <div className="mb-3" style={{padding:'12px',background:'#FEF2F2',borderRadius:'8px',border:'1px solid var(--danger)'}}>
                <p style={{fontWeight:600,color:'var(--danger)',marginBottom:'8px'}}><FiAlertCircle /> Drug Interactions Found!</p>
                {interactions.map((inter, i) => <p key={i} style={{fontSize:'13px',color:'#991B1B'}}>{inter.drug1} + {inter.drug2}: {inter.severity} - {inter.description}</p>)}
              </div>
            )}

            <div className="form-row">
              <div className="form-group"><label>Investigations</label><textarea className="form-control" value={form.investigations} onChange={e => setForm({...form, investigations: e.target.value})} /></div>
              <div className="form-group"><label>Advice</label><textarea className="form-control" value={form.advice} onChange={e => setForm({...form, advice: e.target.value})} /></div>
            </div>

            <div className="form-group">
              <label>Follow-up Date</label>
              <input type="date" className="form-control" style={{maxWidth:'200px'}} value={form.followUpDate} onChange={e => setForm({...form, followUpDate: e.target.value})} />
            </div>

            <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
              {loading ? 'Creating...' : '✓ Create Prescription'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default DoctorPrescriptions;
