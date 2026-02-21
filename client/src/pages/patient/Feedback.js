import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { FiStar, FiSend } from 'react-icons/fi';
import toast from 'react-hot-toast';

const Feedback = () => {
  const [appointments, setAppointments] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [tab, setTab] = useState('give');
  const [form, setForm] = useState({ appointment: '', doctor: '', rating: 5, categories: { cleanliness: 5, staffBehavior: 5, waitTime: 5, treatment: 5 }, comment: '', anonymous: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [apptRes, fbRes] = await Promise.all([
          api.get('/api/appointments/history').catch(() => ({ data: { data: [] } })),
          api.get('/api/feedback/my-feedback').catch(() => ({ data: { data: [] } })),
        ]);
        setAppointments((apptRes.data.data || apptRes.data || []).filter(a => a.status === 'completed'));
        setFeedbacks(fbRes.data.data || fbRes.data || []);
      } catch {} finally { setLoading(false); }
    };
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/feedback', form);
      toast.success('Thank you for your feedback!');
      setForm({ appointment: '', doctor: '', rating: 5, categories: { cleanliness: 5, staffBehavior: 5, waitTime: 5, treatment: 5 }, comment: '', anonymous: false });
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const StarRating = ({ value, onChange }) => (
    <div className="stars">
      {[1,2,3,4,5].map(i => (
        <span key={i} className={`star ${i <= value ? 'filled' : ''}`} onClick={() => onChange(i)}>★</span>
      ))}
    </div>
  );

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header"><h1>Feedback</h1><p>Help us improve</p></div>

      <div className="tabs">
        <button className={`tab ${tab === 'give' ? 'active' : ''}`} onClick={() => setTab('give')}>Give Feedback</button>
        <button className={`tab ${tab === 'my' ? 'active' : ''}`} onClick={() => setTab('my')}>My Feedback</button>
      </div>

      {tab === 'give' ? (
        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Select Appointment</label>
              <select className="form-control" value={form.appointment} onChange={e => {
                const apt = appointments.find(a => a._id === e.target.value);
                setForm({...form, appointment: e.target.value, doctor: apt?.doctor?._id || ''});
              }}>
                <option value="">Choose...</option>
                {appointments.map(a => <option key={a._id} value={a._id}>Dr. {a.doctor?.firstName} {a.doctor?.lastName} - {new Date(a.date).toLocaleDateString()}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Overall Rating</label>
              <StarRating value={form.rating} onChange={v => setForm({...form, rating: v})} />
            </div>

            <div className="form-row">
              {Object.entries(form.categories).map(([key, val]) => (
                <div key={key} className="form-group">
                  <label>{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                  <StarRating value={val} onChange={v => setForm({...form, categories: {...form.categories, [key]: v}})} />
                </div>
              ))}
            </div>

            <div className="form-group">
              <label>Comments</label>
              <textarea className="form-control" value={form.comment} onChange={e => setForm({...form, comment: e.target.value})} placeholder="Share your experience..." />
            </div>

            <label className="flex gap-2 items-center mb-4" style={{fontSize:'14px'}}>
              <input type="checkbox" checked={form.anonymous} onChange={e => setForm({...form, anonymous: e.target.checked})} />
              Submit anonymously
            </label>

            <button type="submit" className="btn btn-primary"><FiSend /> Submit Feedback</button>
          </form>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {feedbacks.length === 0 ? <div className="empty-state"><h3>No feedback given yet</h3></div> :
            feedbacks.map(fb => (
              <div key={fb._id} className="card" style={{padding:'16px'}}>
                <div className="flex justify-between items-center">
                  <div>
                    <strong>Dr. {fb.doctor?.firstName} {fb.doctor?.lastName}</strong>
                    <div className="stars mt-1">{[1,2,3,4,5].map(i => <span key={i} className={`star ${i <= fb.rating ? 'filled' : ''}`}>★</span>)}</div>
                    {fb.comment && <p style={{fontSize:'13px',marginTop:'8px'}}>{fb.comment}</p>}
                    {fb.response && (
                      <div style={{marginTop:'8px',padding:'8px 12px',background:'var(--gray-50)',borderRadius:'8px',borderLeft:'3px solid var(--primary)'}}>
                        <p style={{fontSize:'12px',fontWeight:600,color:'var(--primary)'}}>Response:</p>
                        <p style={{fontSize:'13px'}}>{fb.response}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
};

export default Feedback;
