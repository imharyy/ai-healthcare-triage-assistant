import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { FiUsers, FiCalendar, FiDollarSign, FiTrendingUp, FiActivity, FiLayers } from 'react-icons/fi';
import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler } from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

const AdminDashboard = () => {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/analytics')
      .then(r => setStats(r.data.data || r.data || {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  const trendData = {
    labels: stats.dailyTrends?.map(d => d.date) || ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
    datasets: [{
      label: 'Patients', data: stats.dailyTrends?.map(d => d.patients) || [45,52,38,65,72,30,20],
      borderColor: '#4F46E5', backgroundColor: 'rgba(79,70,229,0.1)', fill: true, tension: 0.4,
    }]
  };

  const revenueData = {
    labels: stats.revenueData?.map(d => d.month) || ['Jan','Feb','Mar','Apr','May','Jun'],
    datasets: [{
      label: 'Revenue (₹)', data: stats.revenueData?.map(d => d.amount) || [150000,200000,180000,250000,300000,280000],
      backgroundColor: '#06B6D4',
    }]
  };

  return (
    <div>
      <div className="page-header"><h1>Admin Dashboard</h1><p>Hospital overview and analytics</p></div>

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-icon primary"><FiUsers /></div>
          <div className="stat-info"><h3>{stats.totalPatients || 0}</h3><p>Total Patients</p></div></div>
        <div className="stat-card"><div className="stat-icon success"><FiActivity /></div>
          <div className="stat-info"><h3>{stats.totalDoctors || 0}</h3><p>Doctors</p></div></div>
        <div className="stat-card"><div className="stat-icon warning"><FiCalendar /></div>
          <div className="stat-info"><h3>{stats.todayAppointments || 0}</h3><p>Today's Appointments</p></div></div>
        <div className="stat-card"><div className="stat-icon info"><FiLayers /></div>
          <div className="stat-info"><h3>{stats.bedOccupancy || 0}%</h3><p>Bed Occupancy</p></div></div>
        <div className="stat-card"><div className="stat-icon secondary"><FiDollarSign /></div>
          <div className="stat-info"><h3>₹{stats.monthRevenue || 0}</h3><p>Monthly Revenue</p></div></div>
        <div className="stat-card"><div className="stat-icon danger"><FiTrendingUp /></div>
          <div className="stat-info"><h3>{stats.avgWaitTime || 0} min</h3><p>Avg Wait Time</p></div></div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3 className="card-title mb-3">Patient Trends</h3>
          <Line data={trendData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
        </div>
        <div className="card">
          <h3 className="card-title mb-3">Revenue</h3>
          <Bar data={revenueData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
        </div>
      </div>

      {stats.doctorPerformance?.length > 0 && (
        <div className="card mt-4">
          <h3 className="card-title mb-3">Doctor Performance</h3>
          <div className="table-container">
            <table>
              <thead><tr><th>Doctor</th><th>Patients Today</th><th>Avg Wait</th><th>Rating</th><th>Revenue</th></tr></thead>
              <tbody>
                {stats.doctorPerformance.map((doc, i) => (
                  <tr key={i}>
                    <td><strong>Dr. {doc.name}</strong></td>
                    <td>{doc.patientsToday}</td>
                    <td>{doc.avgWaitTime} min</td>
                    <td>⭐ {doc.rating?.toFixed(1) || 'N/A'}</td>
                    <td>₹{doc.revenue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
