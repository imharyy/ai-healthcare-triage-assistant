import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { FiCalendar, FiClock, FiXCircle } from 'react-icons/fi';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const Appointments = () => {
  const [tab, setTab] = useState('upcoming');
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const endpoint = tab === 'upcoming' ? '/api/appointments/upcoming' : '/api/appointments/history';
      const { data } = await api.get(endpoint);
      setAppointments(data.data || data || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [tab]);

  const cancelAppt = async (id) => {
    if (!window.confirm('Cancel this appointment?')) return;
    try {
      await api.put(`/api/appointments/cancel/${id}`);
      toast.success('Appointment cancelled');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to cancel'); }
  };

  const checkin = async (id) => {
    try {
      await api.put(`/api/appointments/check-in/${id}`);
      toast.success('Checked in! You are now in the queue.');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Check-in failed'); }
  };

  const getStatusBadge = (s) => {
    const map = { scheduled: 'badge-info', confirmed: 'badge-primary', 'checked-in': 'badge-warning', 'in-progress': 'badge-success', completed: 'badge-gray', cancelled: 'badge-danger' };
    return <span className={`badge ${map[s] || 'badge-gray'}`}>{s}</span>;
  };

  return (
    <div>
      <div className="page-header flex justify-between items-center">
        <div><h1>My Appointments</h1><p>Manage your healthcare visits</p></div>
        <Link to="/patient/book-appointment" className="btn btn-primary"><FiCalendar /> Book New</Link>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'upcoming' ? 'active' : ''}`} onClick={() => setTab('upcoming')}>Upcoming</button>
        <button className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>History</button>
      </div>

      {loading ? <div className="loading-page"><div className="spinner"></div></div> :
        appointments.length === 0 ? (
          <div className="empty-state">
            <h3>No {tab} appointments</h3>
            <Link to="/patient/book-appointment" className="btn btn-primary mt-3">Book Appointment</Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {appointments.map(apt => (
              <div key={apt._id} className="card" style={{padding:'16px'}}>
                <div className="flex justify-between items-center" style={{flexWrap:'wrap',gap:'12px'}}>
                  <div className="flex gap-3 items-center">
                    <div className="queue-token" style={{background: apt.status === 'cancelled' ? 'var(--gray-400)' : 'var(--primary)'}}>
                      {apt.tokenNumber || '#'}
                    </div>
                    <div>
                      <strong>Dr. {apt.doctor?.firstName} {apt.doctor?.lastName}</strong>
                      <p style={{fontSize:'13px',color:'var(--gray-500)'}}>{apt.department?.name}</p>
                      <p style={{fontSize:'12px',color:'var(--gray-400)'}}>
                        <FiCalendar style={{display:'inline'}} /> {format(new Date(apt.date), 'MMM d, yyyy')} • <FiClock style={{display:'inline'}} /> {apt.timeSlot?.startTime} - {apt.timeSlot?.endTime}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    {getStatusBadge(apt.status)}
                    {apt.status === 'confirmed' && (
                      <button className="btn btn-success btn-sm" onClick={() => checkin(apt._id)}>Check In</button>
                    )}
                    {['scheduled','confirmed'].includes(apt.status) && (
                      <button className="btn btn-sm btn-danger" onClick={() => cancelAppt(apt._id)}><FiXCircle /></button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
};

export default Appointments;
