import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { FiCalendar, FiCheck, FiSearch } from 'react-icons/fi';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const ReceptionistAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/receptionist/appointments?date=${date}`);
      setAppointments(data.data || data || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [date]);

  const checkin = async (id) => {
    try {
      await api.put(`/api/appointments/check-in/${id}`);
      toast.success('Patient checked in');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const confirmAttendance = async (id) => {
    try {
      await api.put(`/api/appointments/confirm/${id}`);
      toast.success('Confirmed');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const filtered = appointments.filter(a =>
    `${a.patient?.firstName} ${a.patient?.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    `${a.doctor?.firstName} ${a.doctor?.lastName}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header"><h1>Appointments</h1><p>Today's appointments management</p></div>

      <div className="flex gap-3 mb-4 items-center" style={{flexWrap:'wrap'}}>
        <input type="date" className="form-control" style={{maxWidth:'180px'}} value={date} onChange={e => setDate(e.target.value)} />
        <div className="search-box"><FiSearch /><input placeholder="Search patient or doctor..." value={search} onChange={e => setSearch(e.target.value)} /></div>
      </div>

      {loading ? <div className="loading-page"><div className="spinner"></div></div> :
        <div className="table-container card">
          <table>
            <thead><tr><th>Token</th><th>Patient</th><th>Doctor</th><th>Time</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.length === 0 ? <tr><td colSpan="6" className="text-center" style={{padding:'30px',color:'var(--gray-500)'}}>No appointments</td></tr> :
                filtered.map(apt => (
                  <tr key={apt._id}>
                    <td><div className="queue-token" style={{width:'32px',height:'32px',fontSize:'12px'}}>{apt.tokenNumber}</div></td>
                    <td><strong>{apt.patient?.firstName} {apt.patient?.lastName}</strong><br/><span style={{fontSize:'12px',color:'var(--gray-500)'}}>{apt.patient?.phone}</span></td>
                    <td>Dr. {apt.doctor?.firstName} {apt.doctor?.lastName}</td>
                    <td>{apt.timeSlot?.startTime} - {apt.timeSlot?.endTime}</td>
                    <td><span className={`badge badge-${apt.status === 'checked-in' ? 'success' : apt.status === 'confirmed' ? 'primary' : 'info'}`}>{apt.status}</span></td>
                    <td>
                      <div className="flex gap-2">
                        {apt.status === 'scheduled' && <button className="btn btn-sm btn-primary" onClick={() => confirmAttendance(apt._id)}><FiCheck /> Confirm</button>}
                        {apt.status === 'confirmed' && <button className="btn btn-sm btn-success" onClick={() => checkin(apt._id)}><FiCheck /> Check In</button>}
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  );
};

export default ReceptionistAppointments;
