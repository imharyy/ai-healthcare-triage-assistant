import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { FiDownload, FiPackage } from 'react-icons/fi';
import { format } from 'date-fns';

const Prescriptions = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/prescriptions/my')
      .then(r => setPrescriptions(r.data.data || r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const downloadPdf = async (id) => {
    try {
      const response = await api.get(`/api/prescriptions/${id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url; link.download = `prescription-${id}.pdf`; link.click();
    } catch { /* silent */ }
  };

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header"><h1>Prescriptions</h1><p>Your e-prescriptions</p></div>

      {prescriptions.length === 0 ? (
        <div className="empty-state"><FiPackage style={{fontSize:'48px'}} /><h3>No prescriptions yet</h3></div>
      ) : (
        <div className="flex flex-col gap-3">
          {prescriptions.map(rx => (
            <div key={rx._id} className="card" style={{padding:'16px'}}>
              <div className="flex justify-between items-center" style={{flexWrap:'wrap',gap:'12px'}}>
                <div>
                  <strong>Dr. {rx.doctor?.firstName} {rx.doctor?.lastName || 'Doctor'}</strong>
                  <p style={{fontSize:'13px',color:'var(--gray-500)'}}>
                    {format(new Date(rx.createdAt), 'MMM d, yyyy')} • {rx.medications?.length || 0} medications
                  </p>
                  <div className="flex gap-2 mt-2" style={{flexWrap:'wrap'}}>
                    {rx.medications?.slice(0, 3).map((m, i) => (
                      <span key={i} className="badge badge-info">{m.name} - {m.dosage}</span>
                    ))}
                    {rx.medications?.length > 3 && <span className="badge badge-gray">+{rx.medications.length - 3} more</span>}
                  </div>
                  {rx.diagnosis && <p style={{fontSize:'13px',marginTop:'8px',color:'var(--gray-600)'}}>Diagnosis: {rx.diagnosis}</p>}
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-sm btn-primary" onClick={() => downloadPdf(rx._id)}><FiDownload /> PDF</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Prescriptions;
