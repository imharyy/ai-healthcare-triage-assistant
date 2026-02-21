import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { FiCalendar, FiClock, FiActivity, FiAlertTriangle, FiArrowRight, FiCpu, FiMonitor } from 'react-icons/fi';
import { format, isAfter, startOfDay } from 'date-fns';

const PatientDashboard = () => {
  const { user } = useAuth();
  const [upcoming, setUpcoming] = useState([]);
  const [diagnosticBookings, setDiagnosticBookings] = useState([]);
  const [queueInfo, setQueueInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [apptRes, diagRes] = await Promise.all([
          api.get('/api/appointments/upcoming').catch(() => ({ data: { data: [] } })),
          api.get('/api/diagnostic/my-bookings').catch(() => ({ data: { data: [] } })),
        ]);
        setUpcoming((apptRes.data.data || apptRes.data || []).slice(0, 5));

        // Filter diagnostic bookings to show only upcoming (today or future) & non-completed
        const today = startOfDay(new Date());
        const allDiag = (diagRes.data.data || diagRes.data || []);
        const upcomingDiag = allDiag
          .filter(b => b.status !== 'completed' && b.status !== 'cancelled' && isAfter(new Date(b.orderedDate), today) || format(new Date(b.orderedDate), 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd'))
          .slice(0, 5);
        setDiagnosticBookings(upcomingDiag);
      } catch {} finally { setLoading(false); }
    };
    load();
  }, []);

  // Merge doctor appointments and diagnostic bookings into one unified list for the combined view
  const combinedUpcoming = [
    ...upcoming.map(apt => ({
      _id: apt._id,
      type: 'doctor',
      title: `Dr. ${apt.doctor?.firstName || ''} ${apt.doctor?.lastName || ''}`,
      subtitle: apt.department?.name || 'Consultation',
      date: apt.date,
      time: apt.timeSlot ? `${apt.timeSlot.startTime} - ${apt.timeSlot.endTime}` : '',
      token: apt.tokenNumber,
      status: apt.status,
    })),
    ...diagnosticBookings.map(b => ({
      _id: b._id,
      type: 'diagnostic',
      title: b.testName,
      subtitle: b.category === 'imaging' ? 'Radiology' : 'Pathology',
      date: b.orderedDate,
      time: '',
      token: null,
      status: b.status,
    })),
  ].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 6);

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <h1>Welcome, {user?.name?.split(' ')[0]}!</h1>
        <p>Here's your health overview</p>
      </div>

      {/* AI Assistant Banner */}
      <Link to="/patient/ai-assistant" style={{ textDecoration: 'none' }}>
        <div style={{
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7)',
          borderRadius: '12px',
          padding: '20px 24px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#fff',
          cursor: 'pointer',
          transition: 'transform 0.2s, box-shadow 0.2s',
          boxShadow: '0 4px 15px rgba(99,102,241,0.3)',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(99,102,241,0.4)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(99,102,241,0.3)'; }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '12px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FiCpu size={28} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>AI Health Assistant</h3>
              <p style={{ margin: '4px 0 0', fontSize: '14px', opacity: 0.9 }}>Describe your symptoms and get instant triage, medication suggestions & specialist recommendations</p>
            </div>
          </div>
          <FiArrowRight size={24} style={{ flexShrink: 0 }} />
        </div>
      </Link>

      {/* AI Report Analyzer Banner */}
      <Link to="/patient/report-analyzer" style={{ textDecoration: 'none' }}>
        <div style={{
          background: 'linear-gradient(135deg, #059669, #10b981, #34d399)',
          borderRadius: '12px',
          padding: '20px 24px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#fff',
          cursor: 'pointer',
          transition: 'transform 0.2s, box-shadow 0.2s',
          boxShadow: '0 4px 15px rgba(5,150,105,0.3)',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(5,150,105,0.4)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(5,150,105,0.3)'; }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '12px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FiActivity size={28} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>AI Report Analyzer</h3>
              <p style={{ margin: '4px 0 0', fontSize: '14px', opacity: 0.9 }}>Import lab & radiology reports for instant severity analysis, medication advice & estimated treatment costs</p>
            </div>
          </div>
          <FiArrowRight size={24} style={{ flexShrink: 0 }} />
        </div>
      </Link>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon primary"><FiCalendar /></div>
          <div className="stat-info"><h3>{upcoming.length}</h3><p>Doctor Appointments</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(168,85,247,0.12)', color: '#8b5cf6' }}><FiMonitor /></div>
          <div className="stat-info"><h3>{diagnosticBookings.length}</h3><p>Lab / Radiology</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon success"><FiActivity /></div>
          <div className="stat-info"><h3>{user?.bloodGroup || 'N/A'}</h3><p>Blood Group</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon danger"><FiAlertTriangle /></div>
          <div className="stat-info"><h3>{user?.allergies?.length || 0}</h3><p>Known Allergies</p></div>
        </div>
      </div>

      <div className="grid-2">
        {/* Combined Upcoming Appointments */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Upcoming Appointments</h3>
            <Link to="/patient/appointments" className="btn btn-sm btn-outline">View All <FiArrowRight /></Link>
          </div>
          {combinedUpcoming.length === 0 ? (
            <div className="empty-state"><p>No upcoming appointments</p>
              <Link to="/patient/book-appointment" className="btn btn-primary btn-sm mt-3">Book Appointment</Link>
            </div>
          ) : combinedUpcoming.map(item => (
            <div key={item._id} className="queue-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                  background: item.type === 'doctor' ? 'rgba(37,99,235,0.1)' : 'rgba(168,85,247,0.1)',
                  color: item.type === 'doctor' ? '#2563eb' : '#8b5cf6',
                  fontSize: '14px',
                }}>
                  {item.type === 'doctor' ? <FiCalendar /> : <FiMonitor />}
                </span>
                <div>
                  <strong>{item.title}</strong>
                  <p style={{ fontSize: '13px', color: 'var(--gray-500)' }}>
                    {item.subtitle}
                    {item.token ? ` • Token: ${item.token}` : ''}
                  </p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className={`badge ${item.type === 'doctor' ? 'badge-primary' : 'badge-warning'}`}>
                  {format(new Date(item.date), 'MMM d')}
                </span>
                {item.time && (
                  <p style={{ fontSize: '12px', marginTop: '4px' }}>{item.time}</p>
                )}
                {item.type === 'diagnostic' && (
                  <p style={{ fontSize: '11px', marginTop: '2px', color: '#8b5cf6', fontWeight: 500 }}>
                    {item.status === 'ordered' ? 'Scheduled' : item.status}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Quick Actions</h3>
          </div>
          <div className="flex flex-col gap-3">
            <Link to="/patient/book-appointment" className="btn btn-primary btn-block"><FiCalendar /> Book Doctor Appointment</Link>
            <Link to="/patient/book-diagnostic" className="btn btn-block" style={{ background: 'linear-gradient(135deg,#8b5cf6,#a855f7)', color: '#fff', border: 'none' }}><FiMonitor /> Book Lab / Radiology</Link>
            <Link to="/patient/ai-assistant" className="btn btn-block" style={{ background: 'linear-gradient(135deg,#6366f1,#818cf8)', color: '#fff', border: 'none' }}><FiCpu /> AI Health Assistant</Link>
            <Link to="/patient/queue" className="btn btn-outline btn-block"><FiClock /> Check Queue Status</Link>
            <Link to="/patient/records" className="btn btn-outline btn-block"><FiActivity /> View Medical Records</Link>
            <Link to="/patient/emergency" className="btn btn-emergency btn-block"><FiAlertTriangle /> Emergency SOS</Link>
          </div>
        </div>
      </div>

      {/* Lab & Radiology Section */}
      <div style={{ marginTop: '24px' }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Lab & Radiology Bookings</h3>
            <Link to="/patient/book-diagnostic" className="btn btn-sm btn-outline">Book Test <FiArrowRight /></Link>
          </div>
          {diagnosticBookings.length === 0 ? (
            <div className="empty-state">
              <p>No upcoming lab or radiology tests</p>
              <Link to="/patient/book-diagnostic" className="btn btn-sm mt-3" style={{ background: '#8b5cf6', color: '#fff', border: 'none' }}>Book Lab / Radiology</Link>
            </div>
          ) : (
            <div>
              {diagnosticBookings.slice(0, 4).map(b => (
                <div key={b._id} className="queue-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
                      background: b.category === 'imaging' ? 'rgba(245,158,11,0.1)' : 'rgba(168,85,247,0.1)',
                      color: b.category === 'imaging' ? '#f59e0b' : '#8b5cf6',
                      fontSize: '18px',
                    }}>
                      {b.category === 'imaging' ? '🔬' : '🧪'}
                    </span>
                    <div>
                      <strong>{b.testName}</strong>
                      <p style={{ fontSize: '13px', color: 'var(--gray-500)', margin: 0 }}>
                        {b.category === 'imaging' ? 'Radiology' : 'Pathology'}
                        {b.hospital?.name ? ` • ${b.hospital.name}` : ''}
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="badge badge-warning">{format(new Date(b.orderedDate), 'MMM d, yyyy')}</span>
                    <p style={{ fontSize: '12px', marginTop: '4px', fontWeight: 500, color: b.status === 'ordered' ? '#8b5cf6' : b.status === 'in-progress' ? '#f59e0b' : '#10b981' }}>
                      {b.status === 'ordered' ? 'Scheduled' : b.status === 'in-progress' ? 'In Progress' : b.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;
