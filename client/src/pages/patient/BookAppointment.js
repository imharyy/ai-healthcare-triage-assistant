import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { FiSearch, FiCalendar, FiClock, FiMapPin } from 'react-icons/fi';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const BookAppointment = () => {
  const [step, setStep] = useState(1);
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [slots, setSlots] = useState([]);
  const [symptoms, setSymptoms] = useState('');
  const [triageResult, setTriageResult] = useState(null);
  const [selected, setSelected] = useState({ department: '', doctor: null, date: '', slot: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/api/hospitals').then(r => {
      const h = (r.data.data || r.data)?.[0];
      if (h?._id) api.get(`/api/hospitals/${h._id}/departments`).then(d => setDepartments(d.data.data || d.data || []));
    }).catch(() => {});
  }, []);

  const handleTriage = async () => {
    if (!symptoms.trim()) return;
    try {
      const { data } = await api.post('/api/triage/assess', { symptoms: symptoms.split(',').map(s => s.trim()) });
      const t = data.data || data;
      setTriageResult(t);
      if (t.recommendedDepartment) {
        const dept = departments.find(d => d.name?.toLowerCase().includes(t.recommendedDepartment?.toLowerCase()));
        if (dept) setSelected(s => ({...s, department: dept._id}));
      }
      toast.success('Triage assessment complete');
    } catch { toast.error('Triage failed'); }
  };

  const loadDoctors = async (deptId) => {
    setSelected(s => ({...s, department: deptId, doctor: null, date: '', slot: ''}));
    try {
      const { data } = await api.get(`/api/patients/search-doctors?department=${deptId}`);
      setDoctors(data.data || data || []);
      setStep(2);
    } catch { setDoctors([]); }
  };

  const loadSlots = async (date) => {
    setSelected(s => ({...s, date, slot: ''}));
    if (!selected.doctor || !date) return;
    try {
      const { data } = await api.get(`/api/appointments/available-slots?doctorId=${selected.doctor._id}&date=${date}`);
      const slotData = data.data || data;
      const allSlots = slotData.slots || slotData || [];
      setSlots(Array.isArray(allSlots) ? allSlots.filter(s => !s.isBooked) : []);
    } catch { setSlots([]); }
  };

  const bookAppointment = async () => {
    setLoading(true);
    try {
      // Get hospitalId from the selected doctor or fallback to first hospital
      let hospitalId = selected.doctor?.hospital?._id || selected.doctor?.hospital;
      if (!hospitalId) {
        const hRes = await api.get('/api/hospitals');
        const h = (hRes.data.data || hRes.data)?.[0];
        hospitalId = h?._id;
      }
      await api.post('/api/appointments', {
        doctorId: selected.doctor._id,
        hospitalId,
        departmentId: selected.department,
        date: selected.date,
        startTime: selected.slot?.startTime || selected.slot,
        endTime: selected.slot?.endTime || selected.slot,
        type: triageResult?.recommendTeleconsultation ? 'teleconsultation' : 'clinic',
        symptoms: symptoms,
        reason: symptoms,
        priority: triageResult?.priority || 'normal',
      });
      toast.success('Appointment booked successfully!');
      setStep(1); setSelected({ department: '', doctor: null, date: '', slot: '' }); setSymptoms(''); setTriageResult(null);
    } catch (err) { toast.error(err.response?.data?.message || 'Booking failed'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div className="page-header"><h1>Book Appointment</h1><p>Find a doctor and schedule your visit</p></div>

      {/* Smart Triage */}
      <div className="card mb-4">
        <h3 className="card-title mb-3">🩺 Smart Symptom Checker</h3>
        <p style={{fontSize:'13px',color:'var(--gray-500)',marginBottom:'12px'}}>Enter symptoms (comma separated) for AI triage</p>
        <div className="flex gap-2">
          <input className="form-control" style={{flex:1}} placeholder="e.g., headache, fever, cough" value={symptoms} onChange={e => setSymptoms(e.target.value)} />
          <button className="btn btn-primary" onClick={handleTriage}>Assess</button>
        </div>
        {triageResult && (
          <div className="mt-3" style={{padding:'16px',background:'var(--gray-50)',borderRadius:'8px'}}>
            <div className="flex gap-4 items-center" style={{flexWrap:'wrap'}}>
              <span className={`badge badge-${triageResult.severity === 'high' ? 'danger' : triageResult.severity === 'medium' ? 'warning' : 'success'}`}>
                Severity: {triageResult.severity}
              </span>
              <span className="badge badge-info">Dept: {triageResult.recommendedDepartment}</span>
              <span className="badge badge-gray">Priority: {triageResult.priority}</span>
            </div>
            {triageResult.recommendTeleconsultation && <p className="mt-2" style={{fontSize:'13px',color:'var(--info)'}}>💡 Teleconsultation recommended for your symptoms</p>}
          </div>
        )}
      </div>

      {/* Step 1: Select Department */}
      <div className="card mb-4">
        <h3 className="card-title mb-3">1. Select Department</h3>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:'10px'}}>
          {departments.map(d => (
            <button key={d._id} className={`slot ${selected.department === d._id ? 'selected' : ''}`}
              onClick={() => loadDoctors(d._id)} style={{padding:'14px',textAlign:'left'}}>
              <strong>{d.name}</strong>
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Select Doctor */}
      {step >= 2 && (
        <div className="card mb-4">
          <h3 className="card-title mb-3">2. Select Doctor</h3>
          {doctors.length === 0 ? <p className="text-center" style={{color:'var(--gray-500)'}}>No doctors found</p> :
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))',gap:'12px'}}>
              {doctors.map(doc => (
                <div key={doc._id} className={`queue-item ${selected.doctor?._id === doc._id ? 'active' : ''}`}
                  style={{cursor:'pointer'}} onClick={() => { setSelected(s => ({...s, doctor: doc})); setStep(3); }}>
                  <div>
                    <strong>Dr. {doc.firstName} {doc.lastName}</strong>
                    <p style={{fontSize:'12px',color:'var(--gray-500)'}}>{doc.specialization}</p>
                    <p style={{fontSize:'12px'}}>⭐ {(doc.averageRating || doc.rating)?.toFixed(1) || 'N/A'} • ₹{doc.consultationFee || 500}</p>
                  </div>
                </div>
              ))}
            </div>
          }
        </div>
      )}

      {/* Step 3: Date & Slot */}
      {step >= 3 && (
        <div className="card mb-4">
          <h3 className="card-title mb-3">3. Pick Date & Time</h3>
          <div className="form-group">
            <label><FiCalendar /> Select Date</label>
            <input type="date" className="form-control" style={{maxWidth:'250px'}}
              min={format(new Date(), 'yyyy-MM-dd')}
              value={selected.date} onChange={e => loadSlots(e.target.value)} />
          </div>
          {selected.date && (
            <div className="mt-3">
              <label className="mb-2" style={{fontWeight:600,display:'block'}}><FiClock /> Available Slots</label>
              {slots.length === 0 ? <p style={{color:'var(--gray-500)'}}>No slots available</p> :
                <div className="slot-grid">
                  {slots.map((s, i) => (
                    <button key={s.startTime || i} className={`slot ${selected.slot?.startTime === s.startTime ? 'selected' : ''}`}
                      onClick={() => { setSelected(prev => ({...prev, slot: s})); setStep(4); }}>{s.startTime} - {s.endTime}</button>
                  ))}
                </div>
              }
            </div>
          )}
        </div>
      )}

      {/* Step 4: Confirm */}
      {step >= 4 && selected.slot && (
        <div className="card">
          <h3 className="card-title mb-3">4. Confirm Booking</h3>
          <div style={{padding:'16px',background:'var(--gray-50)',borderRadius:'8px',marginBottom:'16px'}}>
            <p><strong>Doctor:</strong> Dr. {selected.doctor?.firstName} {selected.doctor?.lastName}</p>
            <p><strong>Date:</strong> {format(new Date(selected.date), 'EEEE, MMMM d, yyyy')}</p>
            <p><strong>Time:</strong> {selected.slot?.startTime} - {selected.slot?.endTime}</p>
            <p><strong>Fee:</strong> ₹{selected.doctor?.consultationFee || 500}</p>
          </div>
          <button className="btn btn-primary btn-lg" onClick={bookAppointment} disabled={loading}>
            {loading ? 'Booking...' : '✓ Confirm Appointment'}
          </button>
        </div>
      )}
    </div>
  );
};

export default BookAppointment;
