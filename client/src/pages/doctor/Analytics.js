import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { FiTrendingUp, FiUsers, FiDollarSign, FiClock } from 'react-icons/fi';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const DoctorAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/doctors/analytics')
      .then(r => setAnalytics(r.data.data || r.data || {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  const dailyData = {
    labels: analytics?.dailyPatients?.map(d => d.date) || ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
    datasets: [{
      label: 'Patients', data: analytics?.dailyPatients?.map(d => d.count) || [12,8,15,10,18,6,0],
      borderColor: '#4F46E5', backgroundColor: 'rgba(79,70,229,0.1)', fill: true, tension: 0.4,
    }]
  };

  return (
    <div>
      <div className="page-header"><h1>Analytics</h1><p>Your performance metrics</p></div>

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-icon primary"><FiUsers /></div>
          <div className="stat-info"><h3>{analytics?.totalPatients || 0}</h3><p>Total Patients</p></div></div>
        <div className="stat-card"><div className="stat-icon success"><FiTrendingUp /></div>
          <div className="stat-info"><h3>{analytics?.avgConsultationTime || 15} min</h3><p>Avg Consultation</p></div></div>
        <div className="stat-card"><div className="stat-icon warning"><FiClock /></div>
          <div className="stat-info"><h3>{analytics?.followUpRate || 0}%</h3><p>Follow-up Rate</p></div></div>
        <div className="stat-card"><div className="stat-icon info"><FiDollarSign /></div>
          <div className="stat-info"><h3>₹{analytics?.revenue || 0}</h3><p>Revenue</p></div></div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3 className="card-title mb-3">Daily Patients</h3>
          <Line data={dailyData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
        </div>
        <div className="card">
          <h3 className="card-title mb-3">Consultation Types</h3>
          <Doughnut data={{
            labels: ['In-Person', 'Telemedicine', 'Follow-up'],
            datasets: [{ data: [analytics?.inPersonCount || 70, analytics?.teleCount || 20, analytics?.followUpCount || 10], backgroundColor: ['#4F46E5','#06B6D4','#10B981'] }]
          }} />
        </div>
      </div>
    </div>
  );
};

export default DoctorAnalytics;
