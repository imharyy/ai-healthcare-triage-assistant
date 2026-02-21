import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { FiUsers, FiSearch } from 'react-icons/fi';

const Patients = () => {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/doctors/my-patients')
      .then(r => setPatients(r.data.data || r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = patients.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header"><h1>My Patients</h1><p>Patients you have consulted</p></div>

      <div className="search-box mb-4">
        <FiSearch />
        <input placeholder="Search patients..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state"><FiUsers style={{fontSize:'48px'}} /><h3>No patients found</h3></div>
      ) : (
        <div className="table-container card">
          <table>
            <thead><tr><th>Name</th><th>Age</th><th>Blood Group</th><th>Phone</th><th>Allergies</th></tr></thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p._id}>
                  <td><strong>{p.name}</strong><br/><span style={{fontSize:'12px',color:'var(--gray-500)'}}>{p.email}</span></td>
                  <td>{p.dateOfBirth ? Math.floor((new Date() - new Date(p.dateOfBirth)) / 365.25 / 24 / 60 / 60 / 1000) : '--'}</td>
                  <td><span className="badge badge-danger">{p.bloodGroup || '--'}</span></td>
                  <td>{p.phone || '--'}</td>
                  <td>
                    {p.allergies?.length > 0 ?
                      p.allergies.slice(0, 2).map((a, i) => <span key={i} className="badge badge-warning">{a}</span>) :
                      <span style={{color:'var(--gray-400)'}}>None</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Patients;
