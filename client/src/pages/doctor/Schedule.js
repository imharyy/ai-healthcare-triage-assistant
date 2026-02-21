import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { FiClock, FiSave, FiCalendar } from 'react-icons/fi';
import toast from 'react-hot-toast';

const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const Schedule = () => {
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [blockedDate, setBlockedDate] = useState('');

  useEffect(() => {
    api.get('/api/doctors/schedule')
      .then(r => setSchedule(r.data.data || r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updateSlot = (day, field, value) => {
    if (!schedule) return;
    const slots = { ...(schedule.slots || {}) };
    if (!slots[day]) slots[day] = { isWorking: false, start: '09:00', end: '17:00', breakStart: '13:00', breakEnd: '14:00', maxPatients: 30 };
    slots[day] = { ...slots[day], [field]: value };
    setSchedule({ ...schedule, slots });
  };

  const save = async () => {
    try {
      await api.post('/api/doctors/schedule', schedule);
      toast.success('Schedule saved');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const blockSlot = async () => {
    if (!blockedDate) return;
    try {
      await api.post('/api/doctors/block-slots', { date: blockedDate, reason: 'Blocked' });
      toast.success('Date blocked');
      setBlockedDate('');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header flex justify-between items-center">
        <div><h1>My Schedule</h1><p>Manage your availability</p></div>
        <button className="btn btn-primary" onClick={save}><FiSave /> Save Changes</button>
      </div>

      <div className="card mb-4">
        <h3 className="card-title mb-3"><FiClock /> Weekly Schedule</h3>
        <div className="table-container">
          <table>
            <thead><tr><th>Day</th><th>Working</th><th>Start</th><th>End</th><th>Break Start</th><th>Break End</th><th>Max Patients</th></tr></thead>
            <tbody>
              {days.map(day => {
                const s = schedule?.slots?.[day] || {};
                return (
                  <tr key={day}>
                    <td style={{textTransform:'capitalize',fontWeight:600}}>{day}</td>
                    <td><input type="checkbox" checked={s.isWorking || false} onChange={e => updateSlot(day, 'isWorking', e.target.checked)} /></td>
                    <td><input type="time" className="form-control" style={{width:'120px'}} value={s.start || '09:00'} onChange={e => updateSlot(day, 'start', e.target.value)} /></td>
                    <td><input type="time" className="form-control" style={{width:'120px'}} value={s.end || '17:00'} onChange={e => updateSlot(day, 'end', e.target.value)} /></td>
                    <td><input type="time" className="form-control" style={{width:'120px'}} value={s.breakStart || '13:00'} onChange={e => updateSlot(day, 'breakStart', e.target.value)} /></td>
                    <td><input type="time" className="form-control" style={{width:'120px'}} value={s.breakEnd || '14:00'} onChange={e => updateSlot(day, 'breakEnd', e.target.value)} /></td>
                    <td><input type="number" className="form-control" style={{width:'80px'}} value={s.maxPatients || 30} onChange={e => updateSlot(day, 'maxPatients', parseInt(e.target.value))} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title mb-3"><FiCalendar /> Block Dates</h3>
        <div className="flex gap-2 items-center">
          <input type="date" className="form-control" style={{maxWidth:'200px'}} value={blockedDate} onChange={e => setBlockedDate(e.target.value)} />
          <button className="btn btn-danger" onClick={blockSlot}>Block Date</button>
        </div>
        {schedule?.blockedDates?.length > 0 && (
          <div className="flex gap-2 mt-3" style={{flexWrap:'wrap'}}>
            {schedule.blockedDates.map((d, i) => <span key={i} className="badge badge-danger">{new Date(d.date || d).toLocaleDateString()}</span>)}
          </div>
        )}
      </div>
    </div>
  );
};

export default Schedule;
