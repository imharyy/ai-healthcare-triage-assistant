import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { FiCalendar, FiCheck, FiX } from 'react-icons/fi';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const DoctorAppointments = () => {
  const [tab, setTab] = useState('today');
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const date = tab === 'today' ? format(new Date(), 'yyyy-MM-dd') : '';
      const { data } = await api.get(`/api/appointments/doctor-appointments${date ? `?date=${date}` : ''}`);
      setAppointments(data.data || data || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [tab]);

  const confirm = async (id) => {
    try {
      await api.put(`/api/appointments/confirm/${id}`);
      toast.success('Confirmed');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const cancel = async (id) => {
    try {
      await api.put(`/api/appointments/cancel/${id}`);
      toast('Cancelled');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div>
      <div className="page-header"><h1>Appointments</h1><p>Manage your appointments</p></div>

      <div className="tabs">
        <button className={`tab ${tab === 'today' ? 'active' : ''}`} onClick={() => setTab('today')}>Today</button>
        <button className={`tab ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>All</button>
      </div>

      {loading ? <div className="loading-page"><div className="spinner"></div></div> :
        appointments.length === 0 ? <div className="empty-state"><h3>No appointments</h3></div> :
        <div className="table-container">
          <table>
            <thead><tr><th>Token</th><th>Patient</th><th>Time</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {appointments.map(apt => (
                <tr key={apt._id}>
                  <td><div className="queue-token" style={{width:'32px',height:'32px',fontSize:'12px'}}>{apt.tokenNumber}</div></td>
                  <td><strong>{apt.patient?.firstName} {apt.patient?.lastName || 'Patient'}</strong><br/><span style={{fontSize:'12px',color:'var(--gray-500)'}}>{apt.patient?.phone}</span></td>
                  <td>{apt.timeSlot?.startTime} - {apt.timeSlot?.endTime}<br/><span style={{fontSize:'12px',color:'var(--gray-500)'}}>{format(new Date(apt.date), 'MMM d')}</span></td>
                  <td><span className={`badge badge-${apt.status === 'completed' ? 'success' : apt.status === 'cancelled' ? 'danger' : 'info'}`}>{apt.status}</span></td>
                  <td>
                    <div className="flex gap-2">
                      {apt.status === 'scheduled' && <button className="btn btn-sm btn-success" onClick={() => confirm(apt._id)}><FiCheck /></button>}
                      {['scheduled','confirmed'].includes(apt.status) && <button className="btn btn-sm btn-danger" onClick={() => cancel(apt._id)}><FiX /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }
    </div>
  );
};

export default DoctorAppointments;
