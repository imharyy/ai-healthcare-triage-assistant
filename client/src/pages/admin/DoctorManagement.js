import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { FiActivity, FiSearch } from 'react-icons/fi';

const DoctorManagement = () => {
  const [doctors, setDoctors] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/admin/users?role=doctor')
      .then(r => setDoctors(r.data.data || r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = doctors.filter(d =>
    d.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.specialization?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleActive = async (id, current) => {
    try {
      await api.put(`/api/admin/users/${id}`, { isActive: !current });
      setDoctors(prev => prev.map(d => d._id === id ? {...d, isActive: !current} : d));
    } catch {}
  };

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header"><h1>Doctor Management</h1><p>Manage hospital doctors</p></div>

      <div className="search-box mb-4"><FiSearch /><input placeholder="Search by name or specialization..." value={search} onChange={e => setSearch(e.target.value)} /></div>

      <div className="table-container card">
        <table>
          <thead><tr><th>Doctor</th><th>Specialization</th><th>Fee</th><th>Rating</th><th>Patients</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.map(doc => (
              <tr key={doc._id}>
                <td><strong>Dr. {doc.name}</strong><br/><span style={{fontSize:'12px',color:'var(--gray-500)'}}>{doc.email}</span></td>
                <td>{doc.specialization || '--'}</td>
                <td>₹{doc.consultationFee || 500}</td>
                <td>⭐ {doc.rating?.toFixed(1) || 'N/A'}</td>
                <td>{doc.totalPatients || 0}</td>
                <td><span className={`badge ${doc.isActive !== false ? 'badge-success' : 'badge-danger'}`}>{doc.isActive !== false ? 'Active' : 'Inactive'}</span></td>
                <td><button className={`btn btn-sm ${doc.isActive !== false ? 'btn-danger' : 'btn-success'}`} onClick={() => toggleActive(doc._id, doc.isActive !== false)}>{doc.isActive !== false ? 'Deactivate' : 'Activate'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DoctorManagement;
