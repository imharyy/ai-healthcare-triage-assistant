import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { FiBarChart2 } from 'react-icons/fi';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const AdminAnalytics = () => {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/analytics')
      .then(r => setData(r.data.data || r.data || {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header"><h1>Analytics</h1><p>Comprehensive hospital analytics</p></div>

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-icon primary"><FiBarChart2 /></div>
          <div className="stat-info"><h3>{data.totalPatients || 0}</h3><p>Total Patients</p></div></div>
        <div className="stat-card"><div className="stat-icon success"><FiBarChart2 /></div>
          <div className="stat-info"><h3>{data.noShowRate || 0}%</h3><p>No-Show Rate</p></div></div>
        <div className="stat-card"><div className="stat-icon warning"><FiBarChart2 /></div>
          <div className="stat-info"><h3>{data.peakHour || 'N/A'}</h3><p>Peak Hour</p></div></div>
        <div className="stat-card"><div className="stat-icon info"><FiBarChart2 /></div>
          <div className="stat-info"><h3>{data.avgWaitTime || 0} min</h3><p>Avg Wait Time</p></div></div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3 className="card-title mb-3">Daily Patient Volume</h3>
          <Line data={{
            labels: data.dailyTrends?.map(d => d.date) || ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
            datasets: [{
              label: 'Patients', data: data.dailyTrends?.map(d => d.patients) || [45,52,38,65,72,30,20],
              borderColor: '#4F46E5', backgroundColor: 'rgba(79,70,229,0.1)', fill: true, tension: 0.4,
            }]
          }} options={{ responsive: true }} />
        </div>
        <div className="card">
          <h3 className="card-title mb-3">Department Load</h3>
          <Doughnut data={{
            labels: data.departmentLoad?.map(d => d.name) || ['General','Cardiology','Ortho','ENT','Pediatrics'],
            datasets: [{ data: data.departmentLoad?.map(d => d.count) || [30,20,15,10,25], backgroundColor: ['#4F46E5','#06B6D4','#10B981','#F59E0B','#EF4444'] }]
          }} />
        </div>
        <div className="card">
          <h3 className="card-title mb-3">Hourly Distribution</h3>
          <Bar data={{
            labels: Array.from({length: 12}, (_, i) => `${8+i}:00`),
            datasets: [{
              label: 'Appointments', data: data.hourlyDist || [5,12,18,22,20,15,8,14,16,12,6,3],
              backgroundColor: '#818CF8',
            }]
          }} options={{ responsive: true }} />
        </div>
        <div className="card">
          <h3 className="card-title mb-3">Revenue Trend</h3>
          <Line data={{
            labels: data.revenueTrend?.map(d => d.month) || ['Jan','Feb','Mar','Apr','May','Jun'],
            datasets: [{
              label: 'Revenue (₹)', data: data.revenueTrend?.map(d => d.amount) || [150000,200000,180000,250000,300000,280000],
              borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true, tension: 0.4,
            }]
          }} options={{ responsive: true }} />
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
