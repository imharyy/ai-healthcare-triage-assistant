import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useSocket } from '../../contexts/SocketContext';
import { FiUsers, FiRefreshCw } from 'react-icons/fi';

const Queue = () => {
  const { socket } = useSocket();
  const [queues, setQueues] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { data } = await api.get('/api/receptionist/queues');
      setQueues(data.data || data || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!socket) return;
    socket.on('queueUpdate', load);
    return () => socket.off('queueUpdate', load);
  }, [socket]);

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header flex justify-between items-center">
        <div><h1>Queue Overview</h1><p>Live queue status for all doctors</p></div>
        <button className="btn btn-secondary" onClick={load}><FiRefreshCw /> Refresh</button>
      </div>

      {queues.length === 0 ? (
        <div className="empty-state"><FiUsers style={{fontSize:'48px'}} /><h3>No active queues</h3></div>
      ) : (
        <div className="grid-2">
          {queues.map(q => (
            <div key={q._id} className="card">
              <div className="card-header">
                <h3 className="card-title">Dr. {q.doctor?.firstName} {q.doctor?.lastName}</h3>
                <span className={`badge ${q.status === 'active' ? 'badge-success' : 'badge-gray'}`}>{q.status}</span>
              </div>
              <p style={{fontSize:'13px',color:'var(--gray-500)',marginBottom:'12px'}}>
                Waiting: {q.entries?.filter(e => e.status === 'waiting').length || 0} patients
              </p>
              {q.entries?.filter(e => ['waiting', 'in-progress'].includes(e.status)).slice(0, 5).map((entry, i) => (
                <div key={entry._id || i} className={`queue-item ${entry.status === 'in-progress' ? 'active' : ''}`}>
                  <div className="flex gap-2 items-center">
                    <div className="queue-token" style={{width:'32px',height:'32px',fontSize:'12px',
                      background: entry.status === 'in-progress' ? 'var(--success)' : 'var(--primary)'}}>
                      {entry.tokenNumber}
                    </div>
                    <div>
                      <strong style={{fontSize:'13px'}}>{entry.patient?.firstName} {entry.patient?.lastName || 'Patient'}</strong>
                      <p style={{fontSize:'11px',color:'var(--gray-500)'}}>{entry.status}</p>
                    </div>
                  </div>
                  {entry.priority !== 'normal' && <span className={`badge badge-${entry.priority === 'emergency' ? 'danger' : 'warning'}`}>{entry.priority}</span>}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Queue;
