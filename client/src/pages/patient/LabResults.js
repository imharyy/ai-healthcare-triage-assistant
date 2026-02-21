import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { FiActivity } from 'react-icons/fi';
import { format } from 'date-fns';

const LabResults = () => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/lab/my')
      .then(r => setTests(r.data.data || r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const getStatusColor = (s) => {
    const m = { ordered: 'badge-info', 'sample-collected': 'badge-warning', processing: 'badge-primary', completed: 'badge-success' };
    return m[s] || 'badge-gray';
  };

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header"><h1>Lab Results</h1><p>Track your lab tests and results</p></div>

      {tests.length === 0 ? (
        <div className="empty-state"><FiActivity style={{fontSize:'48px'}} /><h3>No lab tests</h3></div>
      ) : (
        <div className="flex flex-col gap-3">
          {tests.map(test => (
            <div key={test._id} className="card" style={{padding:'16px'}}>
              <div className="flex justify-between items-center" style={{flexWrap:'wrap',gap:'12px'}}>
                <div>
                  <strong>{test.testName || test.testType}</strong>
                  <span className={`badge ${getStatusColor(test.status)} ml-2`} style={{marginLeft:'8px'}}>{test.status}</span>
                  <p style={{fontSize:'13px',color:'var(--gray-500)',marginTop:'4px'}}>
                    Ordered: {format(new Date(test.createdAt), 'MMM d, yyyy')}
                    {test.doctor && ` • Dr. ${test.doctor.name}`}
                  </p>
                  {test.results && test.status === 'completed' && (
                    <div className="mt-3" style={{padding:'12px',background:'var(--gray-50)',borderRadius:'8px'}}>
                      <p style={{fontSize:'13px',fontWeight:600,marginBottom:'8px'}}>Results:</p>
                      {Array.isArray(test.results) ? test.results.map((r, i) => (
                        <div key={i} className="flex justify-between" style={{fontSize:'13px',padding:'4px 0',borderBottom:'1px solid var(--gray-200)'}}>
                          <span>{r.parameter}</span>
                          <span style={{fontWeight:600,color: r.isAbnormal ? 'var(--danger)' : 'var(--success)'}}>
                            {r.value} {r.unit} {r.isAbnormal && '⚠️'}
                          </span>
                        </div>
                      )) : <p style={{fontSize:'13px'}}>{JSON.stringify(test.results)}</p>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LabResults;
