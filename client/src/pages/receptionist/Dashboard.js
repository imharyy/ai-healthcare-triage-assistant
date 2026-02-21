import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { FiUsers, FiCalendar, FiClock, FiDollarSign, FiLayers } from 'react-icons/fi';
import { format } from 'date-fns';

const ReceptionistDashboard = () => {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/receptionist/dashboard')
      .then(r => setStats(r.data.data || r.data || {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <h1>Reception Dashboard</h1>
        <p>{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-icon primary"><FiCalendar /></div>
          <div className="stat-info"><h3>{stats.todayAppointments || 0}</h3><p>Today's Appointments</p></div></div>
        <div className="stat-card"><div className="stat-icon success"><FiUsers /></div>
          <div className="stat-info"><h3>{stats.checkedIn || 0}</h3><p>Checked In</p></div></div>
        <div className="stat-card"><div className="stat-icon warning"><FiClock /></div>
          <div className="stat-info"><h3>{stats.inQueue || 0}</h3><p>In Queue</p></div></div>
        <div className="stat-card"><div className="stat-icon info"><FiLayers /></div>
          <div className="stat-info"><h3>{stats.availableBeds || 0}</h3><p>Available Beds</p></div></div>
        <div className="stat-card"><div className="stat-icon secondary"><FiDollarSign /></div>
          <div className="stat-info"><h3>₹{stats.todayRevenue || 0}</h3><p>Today's Revenue</p></div></div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3 className="card-title mb-3">Doctor Status</h3>
          {stats.doctorStatus?.length > 0 ? stats.doctorStatus.map((doc, i) => (
            <div key={i} className="queue-item">
              <div><strong>Dr. {doc.name}</strong><p style={{fontSize:'12px',color:'var(--gray-500)'}}>{doc.department}</p></div>
              <span className={`badge ${doc.isAvailable ? 'badge-success' : 'badge-gray'}`}>{doc.isAvailable ? 'Available' : 'Busy'}</span>
            </div>
          )) : <p className="text-center" style={{padding:'20px',color:'var(--gray-500)'}}>No doctor data</p>}
        </div>
        <div className="card">
          <h3 className="card-title mb-3">Recent Activity</h3>
          {stats.recentActivity?.length > 0 ? stats.recentActivity.slice(0, 5).map((act, i) => (
            <div key={i} style={{padding:'8px 0',borderBottom:'1px solid var(--gray-100)',fontSize:'13px'}}>
              <strong>{act.patient}</strong> - {act.action}
              <p style={{fontSize:'11px',color:'var(--gray-400)'}}>{new Date(act.time).toLocaleTimeString()}</p>
            </div>
          )) : <p className="text-center" style={{padding:'20px',color:'var(--gray-500)'}}>No recent activity</p>}
        </div>
      </div>
    </div>
  );
};

export default ReceptionistDashboard;
