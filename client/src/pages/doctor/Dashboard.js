import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { FiUsers, FiCalendar, FiClock, FiTrendingUp, FiActivity } from 'react-icons/fi';
import { format } from 'date-fns';

const DoctorDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/doctors/dashboard')
      .then(r => setStats(r.data.data || r.data || {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <h1>Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, Dr. {user?.name?.split(' ')[0]}!</h1>
        <p>{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon primary"><FiUsers /></div>
          <div className="stat-info"><h3>{stats.todayPatients || 0}</h3><p>Today's Patients</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon success"><FiCalendar /></div>
          <div className="stat-info"><h3>{stats.todayAppointments || 0}</h3><p>Appointments</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon warning"><FiClock /></div>
          <div className="stat-info"><h3>{stats.waitingInQueue || 0}</h3><p>In Queue</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon info"><FiActivity /></div>
          <div className="stat-info"><h3>{stats.completedToday || 0}</h3><p>Completed Today</p></div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3 className="card-title mb-3">Today's Queue</h3>
          {stats.currentQueue?.length > 0 ? stats.currentQueue.slice(0, 5).map((p, i) => (
            <div key={i} className="queue-item">
              <div className="flex gap-3 items-center">
                <div className="queue-token">{p.tokenNumber || i + 1}</div>
                <div>
                  <strong>{p.patient?.firstName} {p.patient?.lastName || 'Patient'}</strong>
                  <p style={{fontSize:'12px',color:'var(--gray-500)'}}>{p.status}</p>
                </div>
              </div>
              <span className={`badge ${p.priority === 'emergency' ? 'badge-danger' : p.priority === 'urgent' ? 'badge-warning' : 'badge-gray'}`}>
                {p.priority || 'normal'}
              </span>
            </div>
          )) : <p className="text-center" style={{color:'var(--gray-500)',padding:'20px'}}>No patients in queue</p>}
        </div>

        <div className="card">
          <h3 className="card-title mb-3">Quick Stats</h3>
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center" style={{padding:'12px',background:'var(--gray-50)',borderRadius:'8px'}}>
              <span>Avg Consultation Time</span>
              <strong>{stats.avgConsultationTime || 15} min</strong>
            </div>
            <div className="flex justify-between items-center" style={{padding:'12px',background:'var(--gray-50)',borderRadius:'8px'}}>
              <span>Rating</span>
              <strong>⭐ {user?.rating?.toFixed(1) || 'N/A'}</strong>
            </div>
            <div className="flex justify-between items-center" style={{padding:'12px',background:'var(--gray-50)',borderRadius:'8px'}}>
              <span>Follow-up Rate</span>
              <strong>{stats.followUpRate || 0}%</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;
